import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const revalidate = 1800;

type Offer = {
  id: string; name: string; brand: string; merchant: string; country: string;
  oldPrice: number | null; newPrice: number; currency: string; discount: number | null;
  image: string; url: string; checkedAt: string; sourceStatus: string;
};

const SOURCES = [
  { name: "Jumia Ghana", url: "https://www.jumia.com.gh/home-improvement-appliances/", country: "Ghana" },
  { name: "Melcom", url: "https://melcom.com/categories/electronics-appliances/refrigerators-freezers.html", country: "Ghana" },
  { name: "Mehia", url: "https://mehia.com.gh/", country: "Ghana" },
  { name: "Baahe", url: "https://baahe.org/", country: "Ghana" },
  { name: "Electromart", url: "https://www.electromart.com.gh/", country: "Ghana" },
  { name: "MaxMart", url: "https://maxmartonline.com/", country: "Ghana" },
  { name: "Palace Superstores", url: "https://palacesuperstores.com/", country: "Ghana" },
  { name: "UNA Agencies", url: "https://www.unaagencies.com/", country: "Ghana" },
  { name: "WiredWorld", url: "https://www.wiredworldgh.com/brands", country: "Ghana" }
];

const fridgeWords = /fridge|refrigerator|freezer/i;
const money = (s: string) => {
  const m = s.replace(/,/g, "").match(/(?:GH₵|GHS|₵)\s*([0-9]+(?:\.[0-9]{1,2})?)/i) || s.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:GHS|GH₵)/i);
  return m ? Number(m[1]) : null;
};
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
function brandFrom(name: string) {
  return (name.match(/\b(Hisense|Samsung|LG|Nasco|Midea|TCL|Bruhm|Akai|Chigo|Sigma|Roch|Legacy|Haier|Bosch|Toshiba|Panasonic|Defy|Nexus)\b/i)?.[0] || "Unspecified").toUpperCase();
}
function productNodes(value: any): any[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(productNodes);
  const own = String(value["@type"] || "").toLowerCase().includes("product") ? [value] : [];
  return own.concat(Object.values(value).flatMap(productNodes));
}
function extractJsonLd($: cheerio.CheerioAPI, source: typeof SOURCES[number], checkedAt: string): Offer[] {
  const found: Offer[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).contents().text());
      for (const p of productNodes(parsed)) {
        const name = text(p.name);
        if (!fridgeWords.test(name)) continue;
        const rawOffer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
        const price = Number(rawOffer?.price ?? rawOffer?.lowPrice ?? p.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        const old = Number(rawOffer?.priceSpecification?.price ?? p.priceSpecification?.price);
        const imageValue = Array.isArray(p.image) ? p.image[0] : p.image;
        const rawUrl = text(p.url) || text(rawOffer?.url);
        const url = rawUrl ? new URL(rawUrl, source.url).toString() : source.url;
        const oldPrice = Number.isFinite(old) && old > price ? old : null;
        found.push({ id: source.name + "|" + url, name, brand: text(p.brand?.name || p.brand) || brandFrom(name), merchant: source.name, country: source.country, oldPrice, newPrice: price, currency: text(rawOffer?.priceCurrency) || "GHS", discount: oldPrice ? Math.round((1 - price / oldPrice) * 100) : null, image: text(imageValue), url, checkedAt, sourceStatus: "Public product data" });
      }
    } catch {}
  });
  return found;
}
function extractCards($: cheerio.CheerioAPI, source: typeof SOURCES[number], checkedAt: string): Offer[] {
  const found: Offer[] = [];
  const selectors = "li.product, .product-item, .product-card, .product, [data-product-id], article";
  $(selectors).each((_, el) => {
    const card = $(el);
    const name = (card.find("h2,h3,h4,.product-name,.product-title,[class*=name]").first().text() || card.find("a").first().attr("title") || "").replace(/\s+/g, " ").trim();
    const allText = card.text().replace(/\s+/g, " ").trim();
    if (!fridgeWords.test(name || allText) || allText.length > 1800) return;
    const link = card.find('a[href]').filter((__, a) => /\.html|\/product|\/p\//i.test(String($(a).attr("href")))).first().attr("href") || card.find("a[href]").first().attr("href");
    if (!link) return;
    let url = "";
    try { url = new URL(link, source.url).toString(); } catch { return; }
    const image = card.find("img").first().attr("data-src") || card.find("img").first().attr("src") || "";
    const imageUrl = image ? (() => { try { return new URL(image, source.url).toString(); } catch { return ""; } })() : "";
    const currentText = card.find(".special-price,.price,.woocommerce-Price-amount,[class*=price]").first().text() || allText;
    const newPrice = money(currentText) || money(allText);
    if (!newPrice || newPrice <= 0) return;
    const oldText = card.find("del,.old-price,.regular-price,[class*=old-price],[class*=regular]").text();
    const oldRaw = money(oldText);
    const oldPrice = oldRaw && oldRaw > newPrice ? oldRaw : null;
    const promoHint = /sale|deal|promo|discount|special price|black friday|off\s*\d+|save\s*\d+/i.test(allText);
    if (!oldPrice && !promoHint) return;
    found.push({ id: source.name + "|" + url, name: name || allText.slice(0, 120), brand: brandFrom(name || allText), merchant: source.name, country: source.country, oldPrice, newPrice, currency: "GHS", discount: oldPrice ? Math.round((1 - newPrice / oldPrice) * 100) : null, image: imageUrl, url, checkedAt, sourceStatus: "Public listing" });
  });
  return found;
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(SOURCES.map(async source => {
    try {
      const response = await fetch(source.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PromoFinder/1.0; +https://promofinder-cronosempire.vercel.app)", "Accept": "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(6500),
        next: { revalidate: 1800 }
      });
      if (!response.ok) return { source: source.name, status: "blocked_or_unavailable", count: 0, offers: [] as Offer[] };
      const type = response.headers.get("content-type") || "";
      if (!type.includes("html")) return { source: source.name, status: "not_html", count: 0, offers: [] as Offer[] };
      const html = (await response.text()).slice(0, 2_000_000);
      const $ = cheerio.load(html);
      const offers = [...extractJsonLd($, source, checkedAt), ...extractCards($, source, checkedAt)];
      const unique = offers.filter((o, i, arr) => arr.findIndex(x => x.url === o.url) === i);
      return { source: source.name, status: unique.length ? "collected" : "no_matching_public_promotions", count: unique.length, offers: unique };
    } catch {
      return { source: source.name, status: "timeout_or_blocked", count: 0, offers: [] as Offer[] };
    }
  }));
  const offers = results.flatMap(r => r.offers);
  const unique = offers.filter((o, i, arr) => arr.findIndex(x => x.url === o.url) === i);
  return NextResponse.json({ category: "Fridges", country: "Ghana", checkedAt, offers: unique, sources: results.map(({ source, status, count }) => ({ source, status, count })), total: unique.length });
}
