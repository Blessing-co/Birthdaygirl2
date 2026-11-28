# PromoFinder

Shows promotions and reduced prices from online stores in Ghana, groups them into a
catalogue so you can compare prices and versions, and sends you to the seller to buy.

## Run it

    npm install
    npm run dev     # http://localhost:3000
    npm test

## Where things are

- `lib/collect.ts`: fetches the stores
- `lib/parse.ts`: reads names and prices from a page
- `lib/categories.ts`: product types and keywords
- `lib/catalogue.ts`: groups offers into products

## Limits

- Offers are collected on demand and cached for 30 minutes. There is no database or price history yet.
- Search works within the selected product type.
- Some stores block automated requests or load products with JavaScript.
- Check each store's terms before collecting from it.
