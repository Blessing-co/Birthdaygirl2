import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Source = { name: string; url: string; country: string };
type Offer = {
  id: string; name: string; brand: string; merchant: string; country: string;
  oldPrice: number | null; newPrice: number; currency: string; discount: number | null;
  image: string; url: string; checkedAt: string; sourceStatus: string;
};
const SOURCES: Source[] = [
  { name: "Jumia Ghana", url: "https://www.jumia.com.gh/", country: "Ghana" },
  { name: "Melcom", url: "https://melcom.com/", country: "Ghana" },
  { name: "Mehia", url: "https://mehia.com.gh/", country: "Ghana" },
  { name: "Baahe", url: "https://baahe.org/", country: "Ghana" },
  { name: "Electromart", url: "https://www.electromart.com.gh/", country: "Ghana" },
  { name: "MaxMart", url: "https://maxmartonline.com/", country: "Ghana" },
  { name: "Palace Superstores", url: "https://palacesuperstores.com/", country: "Ghana" },
  { name: "UNA Agencies", url: "https://www.unaagencies.com/", country: "Ghana" },
  { name: "WiredWorld", url: "https://www.wiredworldgh.com/", country: "Ghana" }
];
const CATEGORIES: Record<string, string[]> = {
  "Fridges": ["fridge", "refrigerator"],
  "Freezers": ["freezer", "deep freezer"],
  "Televisions": ["television", "smart tv", "led tv", "oled tv"],
  "Washing machines": ["washing machine", "washer"],
  "Air conditioners": ["air conditioner", "split ac"],
  "Cookers": ["cooker", "oven", "gas stove"],
  "Smartphones": ["smartphone", "mobile phone", "android phone", "iphone"],
  "Feature phones": ["feature phone", "keypad phone"],
  "Tablets": ["tablet", "ipad"],
  "Accessories": ["charger", "earbuds", "headphones", "phone case", "cable"],
  "Laptops": ["laptop", "notebook"],
  "Desktops": ["desktop computer", "desktop pc"],
  "Monitors": ["computer monitor", "monitor"],
  "Men's clothing": ["men shirt", "men trousers", "men clothing", "men jacket"],
  "Women's clothing": ["women dress", "women clothing", "women blouse", "women skirt"],
  "Shoes": ["shoes", "sneakers", "boots", "sandals"],
  "Bags": ["handbag", "backpack", "travel bag"],
  "Furniture": ["sofa", "bed", "wardrobe", "chair", "table"],
  "Kitchenware": ["cookware", "blender", "kettle", "microwave", "kitchen"],
  "Bedding": ["bedsheet", "mattress", "pillow", "duvet"],
  "Lighting": ["lamp", "light bulb", "chandelier"],
  "Food": ["rice", "oil", "sugar", "flour", "food"],
  "Drinks": ["water", "juice", "soft drink", "beverage"],
  "Household supplies": ["detergent", "tissue", "cleaner", "soap"],
  "Car parts": ["brake pad", "filter", "car battery", "spark plug"],
  "Tyres": ["tyre", "tire"],
  "Automotive accessories": ["car accessories", "car charger", "floor mat"],
  "Skincare": ["skin care", "moisturizer", "sunscreen", "face cream"],
  "Haircare": ["shampoo", "conditioner", "hair cream"],
  "Personal care": ["toothpaste", "deodorant", "body lotion", "personal care"]
};
const clean = (v: unknown) => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
function brandFrom(name: string) {
  return name.match(/\b(Hisense|Samsung|LG|Nasco|Midea|TCL|Bruhm|Akai|Chigo|Sigma|Roch|Legacy|Haier|Bosch|Toshiba|Panasonic|Defy|Nexus|Apple|Tecno|Infinix|Itel|HP|Dell|Lenovo|Acer|Asus|Nike|Adidas|Puma)\b/i)?.[0] || "Unspecified";
}
function isPromotion(text: string, old: number | null, now: number) {
  return (old !== null && old > now) || /sale|deal|promo|discount|special price|clearance|black friday|save\s*\d+|off\s*\d+%/i.test(text);
}
function safeUrl(value: unknown, base: string) {
  try {
    const url = new URL(typeof value === "string" ? value : "", base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch { return ""; }
}
function productNodes(value: any): any[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(productNodes);
  const own = String(value["@type"] || "").toLowerCase().split(/\s+/).includes("product") ? [value] : [];
  return own.concat(Object.values(value).flatMap(productNodes));
}
function parsePage(html: string, source: Source, subcategory: string, checkedAt: string): Offer[] {
  const $ = cheerio.load(html);
  const words = CATEGORIES[subcategory] || [subcategory.toLowerCase()];
  const matches = (name: string) => words.some(word => name.toLowerCase().includes(word));
  const found: Offer[] = [];
  const add = (offer: Offer) => {
    if (offer.name && matches(offer.name) && offer.newPrice > 0 &&
        isPromotion(offer.name, offer.oldPrice, offer.newPrice) && offer.url) found.push(offer);
  };
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).contents().text());
      for (const product of productNodes(parsed)) {
        const name = clean(product.name);
        const offerData = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        const now = Number(offerData?.price ?? offerData?.lowPrice ?? product.price);
        if (!name || !Number.isFinite(now) || now <= 0) continue;
        const oldValue = Number(offerData?.priceSpecification?.price ?? product.priceSpecification?.price);
        const oldPrice = Number.isFinite(oldValue) && oldValue > now ? oldValue : null;
        const imageValue = Array.isArray(product.image) ? product.image[0] : product.image;
        const url = safeUrl(product.url || offerData?.url, source.url);
        if (!url) continue;
        add({
          id: source.name + "|" + url, name,
          brand: clean(product.brand?.name || product.brand) || brandFrom(name),
          merchant: source.name, country: source.country, oldPrice, newPrice: now,
          currency: clean(offerData?.priceCurrency).toUpperCase(), discount: oldPrice ? Math.round((1 - now / oldPrice) * 100) : null,
          image: safeUrl(typeof imageValue === "string" ? imageValue : imageValue?.url, source.url),
          url, checkedAt, sourceStatus: "Public structured product data"
        });
      }
    } catch { /* Ignore malformed structured data and continue parsing the page. */ }
  });
  const priceFrom = (value: string): { value: number; currency: string } | null => {
    const text = value.replace(/\u00a0/g, " ");
    const patterns: [RegExp, string][] = [
      [/(?:GH₵|GHS|₵)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i, "GHS"],
      [/(?:₦|NGN)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i, "NGN"],
      [/(?:CFA|XOF|FCFA)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i, "XOF"],
      [/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/, "USD"]
    ];
    for (const [pattern, currency] of patterns) {
      const match = text.match(pattern);
      if (match) return { value: Number(match[1].replace(/,/g, "")), currency };
    }
    return null;
  };
  $("li.product,.product-item,.product-card,.product,[data-product-id],article").each((_, element) => {
    const card = $(element);
    const name = clean(card.find("h2,h3,h4,.product-name,.product-title,[class*=name]").first().text() || card.find("a").first().attr("title"));
    if (!name || !matches(name)) return;
    const allText = clean(card.text());
    const current = priceFrom(card.find(".special-price,.price,.woocommerce-Price-amount,[class*=price]").first().text() || allText);
    if (!current || current.value <= 0) return;
    const previous = priceFrom(card.find("del,.old-price,.regular-price,[class*=old-price],[class*=regular]").text());
    const oldPrice = previous && previous.value > current.value && previous.currency === current.currency ? previous.value : null;
    if (!isPromotion(allText, oldPrice, current.value)) return;
    const href = safeUrl(card.find("a[href]").first().attr("href"), source.url);
    if (!href) return;
    const image = card.find("img").first().attr("data-src") || card.find("img").first().attr("src") || "";
    add({
      id: source.name + "|" + href, name, brand: brandFrom(name), merchant: source.name,
      country: source.country, oldPrice, newPrice: current.value, currency: current.currency,
      discount: oldPrice ? Math.round((1 - current.value / oldPrice) * 100) : null,
      image: safeUrl(image, source.url), url: href, checkedAt, sourceStatus: "Public product listing"
    });
  });
  return found.filter((offer, index, all) => all.findIndex(item => item.url === offer.url) === index);
}
async function fetchWooCommerce(source: Source, subcategory: string, checkedAt: string): Promise<Offer[]> {
  const api = new URL("/wp-json/wc/store/v1/products", source.url);
  api.searchParams.set("search", (CATEGORIES[subcategory] || [subcategory]).slice(0, 3).join(" "));
  api.searchParams.set("on_sale", "true");
  api.searchParams.set("per_page", "50");
  const response = await fetch(api, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PromoFinder/1.0)", Accept: "application/json" },
    signal: AbortSignal.timeout(5500), cache: "no-store"
  });
  if (!response.ok || !(response.headers.get("content-type") || "").includes("json")) return [];
  const rows: any[] = await response.json();
  const words = CATEGORIES[subcategory] || [subcategory.toLowerCase()];
  return rows.flatMap((product: any) => {
    const name = clean(product.name);
    if (!name || !words.some(word => name.toLowerCase().includes(word))) return [];
    const minorUnit = Number(product.prices?.currency_minor_unit ?? 2);
    const divisor = Math.pow(10, Number.isInteger(minorUnit) && minorUnit >= 0 && minorUnit <= 4 ? minorUnit : 2);
    const now = Number(product.prices?.price) / divisor;
    const old = Number(product.prices?.regular_price) / divisor;
    const currency = clean(product.prices?.currency_code).toUpperCase();
    const url = safeUrl(product.permalink, source.url);
    if (!url || !Number.isFinite(now) || !Number.isFinite(old) || now <= 0 || old <= now || !/^[A-Z]{3}$/.test(currency)) return [];
    return [{
      id: source.name + "|" + url, name, brand: clean(product.brands?.[0]?.name) || brandFrom(name),
      merchant: source.name, country: source.country, oldPrice: old, newPrice: now, currency,
      discount: Math.round((1 - now / old) * 100),
      image: safeUrl(product.images?.[0]?.src, source.url), url, checkedAt,
      sourceStatus: "Public WooCommerce Store API"
    } as Offer];
  });
}
async function collectSource(source: Source, subcategory: string, checkedAt: string) {
  const [feedResult, pageResult] = await Promise.allSettled([
    fetchWooCommerce(source, subcategory, checkedAt),
    fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PromoFinder/1.0)", Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(6500), cache: "no-store"
    }).then(async response => {
      if (!response.ok || !(response.headers.get("content-type") || "").includes("html")) return [];
      const html = (await response.text()).slice(0, 2_000_000);
      return parsePage(html, source, subcategory, checkedAt);
    })
  ]);
  const feedOffers = feedResult.status === "fulfilled" ? feedResult.value : [];
  const pageOffers = pageResult.status === "fulfilled" ? pageResult.value : [];
  const offers = [...feedOffers, ...pageOffers].filter((offer, index, all) => all.findIndex(item => item.url === offer.url) === index);
  const bothFailed = feedResult.status === "rejected" && pageResult.status === "rejected";
  const status = offers.length ? "collected" : bothFailed ? "timeout_or_blocked" : "no_matching_public_promotions";
  return { source: source.name, status, count: offers.length, offers };
}
export async function GET(request: NextRequest) {
  const subcategory = request.nextUrl.searchParams.get("subcategory") || "Fridges";
  const country = request.nextUrl.searchParams.get("country") || "Ghana";
  const checkedAt = new Date().toISOString();
  if (!CATEGORIES[subcategory]) {
    return NextResponse.json({ error: "Unsupported product category", offers: [], sources: [], total: 0 }, { status: 400 });
  }
  const selected = SOURCES.filter(source => source.country === country);
  if (!selected.length) {
    return NextResponse.json({
      category: subcategory, country, checkedAt, offers: [], sources: [], total: 0,
      message: "Promotion sources for this country have not been connected yet. Ghana is currently the only configured market."
    });
  }
  const results = await Promise.all(selected.map(source => collectSource(source, subcategory, checkedAt)));
  const offers = results.flatMap(result => result.offers);
  return NextResponse.json({
    category: subcategory, country, checkedAt, offers, total: offers.length,
    sources: results.map(({ source, status, count }) => ({ source, status, count }))
  });
}
