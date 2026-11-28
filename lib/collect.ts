import { CATEGORIES, matchesCategory } from "./categories";
import { brandFrom, clean, parsePage, safeUrl, uniqueByUrl, type Source } from "./parse";
import type { Offer, SourceResult } from "./types";

export const SOURCES: Source[] = [
  { name: "Jumia Ghana", url: "https://www.jumia.com.gh/", country: "Ghana" },
  { name: "Melcom", url: "https://melcom.com/", country: "Ghana" },
  { name: "Mehia", url: "https://mehia.com.gh/", country: "Ghana" },
  { name: "Baahe", url: "https://baahe.org/", country: "Ghana" },
  { name: "Electromart", url: "https://www.electromart.com.gh/", country: "Ghana" },
  { name: "MaxMart", url: "https://maxmartonline.com/", country: "Ghana" },
  { name: "Palace Superstores", url: "https://palacesuperstores.com/", country: "Ghana" },
  { name: "UNA Agencies", url: "https://www.unaagencies.com/", country: "Ghana" },
  { name: "WiredWorld", url: "https://www.wiredworldgh.com/", country: "Ghana" },
  { name: "Intact Ghana", url: "https://www.intactghana.com/", country: "Ghana" },
  { name: "Shopbeta", url: "https://shopbeta.com.gh/", country: "Ghana" },
  { name: "Shopwice", url: "https://shopwice.com/", country: "Ghana" },
  { name: "Mekades", url: "https://mekadesgh.com/", country: "Ghana" }
];

const AGENT = "Mozilla/5.0 (compatible; PromoFinder/1.0)";

// Returns null when the store blocks us or does not answer.
async function get(url: string | URL, accept: string, kind: string): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": AGENT, Accept: accept }, signal: AbortSignal.timeout(5000), cache: "no-store"
    });
    return response.ok && (response.headers.get("content-type") || "").includes(kind) ? response : null;
  } catch { return null; }
}

type WooProduct = {
  name?: string; permalink?: string; brands?: { name?: string }[]; images?: { src?: string }[];
  prices?: { price?: string; regular_price?: string; currency_code?: string; currency_minor_unit?: number };
};

async function fetchWooCommerce(source: Source, subcategory: string, checkedAt: string) {
  let reached = false;
  const lists = await Promise.all(CATEGORIES[subcategory].slice(0, 3).map(async keyword => {
    const api = new URL("/wp-json/wc/store/v1/products", source.url);
    api.search = new URLSearchParams({ search: keyword, on_sale: "true", per_page: "50" }).toString();
    const response = await get(api, "application/json", "json");
    if (!response) return [];
    reached = true;
    const rows = await response.json().catch(() => []) as WooProduct[];
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((product): Offer[] => {
      const name = clean(product.name);
      const unit = Number(product.prices?.currency_minor_unit ?? 2);
      const divisor = 10 ** (Number.isInteger(unit) && unit >= 0 && unit <= 4 ? unit : 2);
      const now = Number(product.prices?.price) / divisor;
      const old = Number(product.prices?.regular_price) / divisor;
      const currency = clean(product.prices?.currency_code).toUpperCase();
      const url = safeUrl(product.permalink, source.url);
      if (!url || !matchesCategory(name, subcategory) || !(now > 0) || !(old > now) || !/^[A-Z]{3}$/.test(currency)) return [];
      return [{
        id: source.name + "|" + url, name, brand: clean(product.brands?.[0]?.name) || brandFrom(name),
        merchant: source.name, country: source.country, oldPrice: old, newPrice: now, currency,
        discount: Math.round((1 - now / old) * 100), image: safeUrl(product.images?.[0]?.src, source.url),
        url, checkedAt, sourceStatus: "Public WooCommerce Store API"
      }];
    });
  }));
  return { offers: lists.flat(), reached };
}

async function collectSource(source: Source, subcategory: string, checkedAt: string) {
  const pages = [new URL(source.url)];
  for (const keyword of CATEGORIES[subcategory].slice(0, 2)) {
    const paths: [string, Record<string, string>][] = [
      ["/", { s: keyword, post_type: "product" }],
      ["/search", { q: keyword, type: "product" }]
    ];
    if (source.name === "Jumia Ghana") paths.push(["/catalog/", { q: keyword }]);
    for (const [path, params] of paths) {
      const url = new URL(path, source.url);
      url.search = new URLSearchParams(params).toString();
      pages.push(url);
    }
  }
  let reached = false;
  const [feed, ...results] = await Promise.all([
    fetchWooCommerce(source, subcategory, checkedAt),
    ...pages.map(async url => {
      const response = await get(url, "text/html,application/xhtml+xml", "html");
      if (!response) return [];
      reached = true;
      const html = await response.text().catch(() => "");
      return parsePage(html.slice(0, 2_000_000), source, subcategory, checkedAt);
    })
  ]);
  const offers = uniqueByUrl([...feed.offers, ...results.flat()]);
  const status: SourceResult["status"] = offers.length ? "collected"
    : reached || feed.reached ? "no_matching_public_promotions" : "blocked_or_unavailable";
  return { source: source.name, status, count: offers.length, offers };
}

export async function collectCategory(subcategory: string, country: string) {
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(SOURCES.filter(s => s.country === country)
    .map(source => collectSource(source, subcategory, checkedAt).catch(() =>
      ({ source: source.name, status: "blocked_or_unavailable" as const, count: 0, offers: [] as Offer[] }))));
  return {
    category: subcategory, country, checkedAt, offers: results.flatMap(r => r.offers),
    sources: results.map(({ source, status, count }): SourceResult => ({ source, status, count }))
  };
}
