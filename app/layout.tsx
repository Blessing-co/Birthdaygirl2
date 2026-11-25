import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PromoFinder | Discover offers across West Africa",
  description: "Find discounts, sales, bundles and special offers from businesses across West Africa."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}