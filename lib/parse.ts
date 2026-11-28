import * as cheerio from "cheerio";
import { matchesCategory } from "./categories";
import type { Offer } from "./types";

export type Source = { name: string; url: string; country: string };
type Price = { value: number; currency: string };

export const clean = (v: unknown) => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";

export function brandFrom(name: string): string {
  return name.match(/\b(Hisense|Samsung|LG|Nasco|Midea|TCL|Bruhm|Akai|Chigo|Sigma|Roch|Legacy|Haier|Bosch|Toshiba|Panasonic|Defy|Nexus|Apple|Tecno|Infinix|Itel|HP|Dell|Lenovo|Acer|Asus|Nike|Adidas|Puma)\b/i)?.[0] || "Unspecified";
}

export function safeUrl(value: unknown, base: string): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch { return ""; }
}

// Whole words only, so "wholesale" and "ideal" are not treated as promotions.
const PROMO = /\b(sale|deals?|promo(?:tion)?|discount(?:ed)?|special price|clearance|black friday)\b|\bsave\s*(?:GH₵|GHS|₵|\$|₦)?\s*\d|\d+%\s*off\b|-\s*\d+%/i;
export const isPromotion = (text: string, old: number | null, now: number) =>
  (old !== null && old > now) || PROMO.test(text);

export function priceFrom(value: string): Price | null {
  const text = value.replace(/ /g, " ");
  const amount = "([0-9][0-9,]*(?:\\.[0-9]{1,2})?)";
  const patterns: [string, string][] = [
    ["(?:GH₵|GHS|GH¢|₵)\\s*" + amount, "GHS"],
    ["(?:₦|NGN)\\s*" + amount, "NGN"],
    ["(?:FCFA|CFA|XOF)\\s*" + amount, "XOF"],
    ["\\$\\s*" + amount, "USD"]
  ];
  for (const [pattern, currency] of patterns) {
    const match = text.match(new RegExp(pattern, "i"));
    if (match) return { value: Number(match[1].replace(/,/g, "")), currency };
  }
  return null;
}

const OLD = "del,s,.old,.price-item--regular,[class*=compare-at],[class*=old-price]";
// Most specific first. A general wrapper is only used after old prices are removed from it.
const CURRENT = [".price-item--sale", ".sale-price", ".deal-price", ".special-price", "ins", ".prc",
  "[class*=sale-price]", ".woocommerce-Price-amount", "[class*=price]"];

export function readPrices(cardHtml: string): { current: Price; oldPrice: number | null } | null {
  const $ = cheerio.load(cardHtml, null, false);
  const first = (selector: string): Price | null => {
    for (const element of $(selector).toArray()) {
      const price = priceFrom($(element).text());
      if (price) return price;
    }
    return null;
  };
  const previous = first(OLD) || first(".price__regular,[class*=regular-price]");
  const withoutOld = cheerio.load(cardHtml, null, false);
  withoutOld(OLD).remove();
  let current: Price | null = null;
  for (const selector of CURRENT) {
    for (const element of withoutOld(selector).toArray()) {
      current = priceFrom(withoutOld(element).text());
      if (current) break;
    }
    if (current) break;
  }
  current = current || priceFrom(withoutOld.root().text());
  if (!current || current.value <= 0) return null;
  const oldPrice = previous && previous.currency === current.currency && previous.value > current.value ? previous.value : null;
  return { current, oldPrice };
}

const discountOf = (old: number | null, now: number) => old ? Math.round((1 - now / old) * 100) : null;
export const uniqueByUrl = (offers: Offer[]) =>
  offers.filter((offer, index, all) => all.findIndex(item => item.url === offer.url) === index);

/* eslint-disable @typescript-eslint/no-explicit-any -- structured data from other sites has no fixed shape */
function productNodes(value: any): any[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(productNodes);
  const own = String(value["@type"] || "").toLowerCase() === "product" ? [value] : [];
  return own.concat(Object.values(value).flatMap(productNodes));
}

export function parsePage(html: string, source: Source, subcategory: string, checkedAt: string): Offer[] {
  const $ = cheerio.load(html);
  const found: Offer[] = [];
  const add = (offer: Offer, evidence: string) => {
    if (offer.url && offer.newPrice > 0 && matchesCategory(offer.name, subcategory) &&
        isPromotion(evidence, offer.oldPrice, offer.newPrice)) found.push(offer);
  };

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      for (const product of productNodes(JSON.parse($(element).text()))) {
        const name = clean(product.name);
        const data = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        const now = Number(data?.price ?? data?.lowPrice ?? product.price);
        const listed = Number(data?.priceSpecification?.price ?? product.priceSpecification?.price);
        const oldPrice = Number.isFinite(listed) && listed > now ? listed : null;
        const image = Array.isArray(product.image) ? product.image[0] : product.image;
        const url = safeUrl(product.url || data?.url, source.url);
        const currency = clean(data?.priceCurrency).toUpperCase();
        if (!name || !Number.isFinite(now) || !/^[A-Z]{3}$/.test(currency)) continue;
        add({
          id: source.name + "|" + url, name, brand: clean(product.brand?.name || product.brand) || brandFrom(name),
          merchant: source.name, country: source.country, oldPrice, newPrice: now, currency,
          discount: discountOf(oldPrice, now),
          image: safeUrl(typeof image === "string" ? image : image?.url, source.url),
          url, checkedAt, sourceStatus: "Public structured product data"
        }, name);
      }
    } catch { /* Skip malformed structured data. */ }
  });

  $("li.product,.product-item,.product-card,.product,[data-product-id],article,[data-qa*=product]").each((_, element) => {
    const card = $(element);
    const name = clean(card.find("h2,h3,h4,.product-name,.product-title,.product-card-title,.product-card__title,.pname,[class*=name],[data-qa*=name]").first().text() || card.find("a").first().attr("title") || card.find("a").first().text());
    if (!name) return;
    const prices = readPrices($.html(element));
    const url = safeUrl(card.is("a") ? card.attr("href") : card.find("a[href]").first().attr("href"), source.url);
    if (!prices || !url) return;
    const img = card.find("img").first();
    add({
      id: source.name + "|" + url, name, brand: brandFrom(name), merchant: source.name, country: source.country,
      oldPrice: prices.oldPrice, newPrice: prices.current.value, currency: prices.current.currency,
      discount: discountOf(prices.oldPrice, prices.current.value),
      image: safeUrl(img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src"), source.url),
      url, checkedAt, sourceStatus: "Public retailer product listing"
    }, ($.html(element) || "").replace(/<[^>]*>/g, " "));  // spaces keep neighbouring words apart
  });
  return uniqueByUrl(found);
}
