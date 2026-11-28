export type Offer = {
  id: string; name: string; brand: string; merchant: string; country: string;
  oldPrice: number | null; newPrice: number; currency: string; discount: number | null;
  image: string; url: string; checkedAt: string; sourceStatus: string;
};
export type SourceStatus = "collected" | "no_matching_public_promotions" | "blocked_or_unavailable";
export type SourceResult = { source: string; status: SourceStatus; count: number };
