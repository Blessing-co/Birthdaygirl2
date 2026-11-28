import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { CATEGORIES } from "@/lib/categories";
import { collectCategory } from "@/lib/collect";

export const runtime = "nodejs";
export const maxDuration = 30;

// One collection per category every 30 minutes, shared by all visitors.
// If every store failed, throw so that the empty result is not cached.
const cached = unstable_cache(async (subcategory: string, country: string) => {
  const data = await collectCategory(subcategory, country);
  if (data.sources.every(s => s.status === "blocked_or_unavailable")) throw new Error("All stores unavailable");
  return data;
}, ["offers-v2"], { revalidate: 1800 });

export async function GET(request: NextRequest) {
  const subcategory = request.nextUrl.searchParams.get("subcategory") || "Fridges";
  const country = request.nextUrl.searchParams.get("country") || "Ghana";
  if (!Object.hasOwn(CATEGORIES, subcategory)) return NextResponse.json({ error: "Unsupported product category" }, { status: 400 });
  if (country !== "Ghana") return NextResponse.json({ error: "Only Ghana is available for now" }, { status: 400 });
  try {
    return NextResponse.json(await cached(subcategory, country));
  } catch {
    return NextResponse.json({ error: "Could not reach any store. Please try again." }, { status: 502 });
  }
}
