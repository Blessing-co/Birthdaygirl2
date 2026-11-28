import type { Offer } from "./types";

export type Product = {
  key: string; name: string; brand: string; image: string; specs: string[];
  currency: string; lowest: number; highest: number; bestDiscount: number | null;
  stores: number; offers: Offer[]; // cheapest first
};

const SPEC = /\b\d+(?:\.\d+)?\s?(?:litres?|ltrs?|l|kg|gb|tb|inch(?:es)?|hp|w)\b|\b\d+(?:\.\d+)?\s?(?:"|”)/gi;

// Sizes and capacities: these are what make one "version" differ from another.
export function specsOf(name: string): string[] {
  const found = (name.match(SPEC) || []).map(s => s.toLowerCase().replace(/\s/g, "")
    .replace(/(litres?|ltrs?)$/, "l").replace(/(inches|inch|”|")$/, "in"));
  return [...new Set(found)].sort();
}

const modelOf = (name: string) => (name.toLowerCase().match(/[a-z0-9-]{4,}/g) || [])
  .find(word => /[a-z]/.test(word) && /\d/.test(word) && !/^\d+(?:\.\d+)?-?(?:gb|tb|kg|ltrs?|litres?|inch|inches|hp|mah|mp|w|l)$/.test(word));

/*
 * Two listings are the same product only when we are fairly sure:
 * same brand + model number + size, or otherwise exactly the same words.
 * Showing two cards is safer than comparing two different items as one.
 */
export function productKey(offer: Offer): string {
  const brand = offer.brand.toLowerCase();
  const model = modelOf(offer.name);
  const identity = model
    ? [model.replace(/-/g, ""), ...specsOf(offer.name)].join(" ")
    : [...new Set(offer.name.toLowerCase().match(/[a-z0-9]+/g) || [])].sort().join(" ");
  return [offer.currency, brand, identity].join("|");
}

export function buildCatalogue(offers: Offer[]): Product[] {
  const groups = new Map<string, Offer[]>();
  for (const offer of offers) {
    const key = productKey(offer);
    groups.set(key, [...(groups.get(key) || []), offer]);
  }
  return [...groups].map(([key, group]) => {
    const sorted = [...group].sort((a, b) => a.newPrice - b.newPrice);
    const discounts = sorted.flatMap(o => o.discount === null ? [] : [o.discount]);
    return {
      key, name: sorted[0].name, brand: sorted[0].brand, image: sorted.find(o => o.image)?.image || "",
      specs: specsOf(sorted[0].name), currency: sorted[0].currency,
      lowest: sorted[0].newPrice, highest: sorted[sorted.length - 1].newPrice,
      bestDiscount: discounts.length ? Math.max(...discounts) : null,
      stores: new Set(sorted.map(o => o.merchant)).size, offers: sorted
    };
  });
}
