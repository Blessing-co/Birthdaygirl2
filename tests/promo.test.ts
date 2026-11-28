import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalogue } from "../lib/catalogue";
import { matchesCategory } from "../lib/categories";
import { isPromotion, parsePage } from "../lib/parse";
import type { Offer } from "../lib/types";

const shop = { name: "Test", url: "https://shop.test/", country: "Ghana" };
const card = (name: string, prices: string) => `<ul><li class="product"><a href="/p"><h2>${name}</h2>${prices}</a></li></ul>`;
const read = (html: string) => parsePage(html, shop, "Fridges", "now").map(o => [o.oldPrice, o.newPrice]);

test("reads the sale price, not the crossed-out one", () => {
  const woo = '<span class="price"><del><span class="woocommerce-Price-amount">GH₵1,000</span></del> <ins><span class="woocommerce-Price-amount">GH₵800</span></ins></span>';
  assert.deepEqual(read(card("Nasco Fridge", woo)), [[1000, 800]]);
  assert.deepEqual(read(card("Nasco Fridge", '<div class="price"><s>GH₵1,000</s> GH₵800</div>')), [[1000, 800]]);
  assert.deepEqual(read(card("Nasco Fridge", '<div class="prc">GH₵ 800</div><div class="old">GH₵ 1,000</div>')), [[1000, 800]]);
});

test("keeps a sale badge, drops a normal price", () => {
  assert.deepEqual(read(card("Nasco Fridge", '<b>Sale!</b><span class="price">GH₵800</span>')), [[null, 800]]);
  assert.deepEqual(read(card("Nasco Fridge", '<span class="price">GH₵800</span>')), []);
  assert.equal(isPromotion("Wholesale fridge", null, 5), false);
});

test("matches whole words only", () => {
  assert.equal(matchesCategory("Toilet Seat", "Food"), false);
  assert.equal(matchesCategory("Dishwasher", "Washing machines"), false);
  assert.equal(matchesCategory("Electric Kettle", "Fridges"), false);
  assert.equal(matchesCategory("Men's Shirt", "Men's clothing"), true);
});

const offer = (name: string, merchant: string, newPrice: number): Offer => ({
  id: merchant + name, name, brand: "Nasco", merchant, country: "Ghana", oldPrice: null, newPrice,
  currency: "GHS", discount: null, image: "", url: "https://shop.test/" + merchant, checkedAt: "now", sourceStatus: ""
});

test("groups the same model across stores and keeps versions apart", () => {
  const products = buildCatalogue([
    offer("Nasco NASF2-15 Fridge 150L", "A", 900),
    offer("Nasco 150 Litres Fridge NASF2-15", "B", 800),
    offer("Nasco NASF2-21 Fridge 210L", "A", 1200)
  ]);
  assert.equal(products.length, 2);
  assert.equal(products[0].lowest, 800);
  assert.equal(products[0].stores, 2);
});
