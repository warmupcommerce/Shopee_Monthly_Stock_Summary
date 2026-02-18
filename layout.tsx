import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopee Sales Analyzer",
  description: "Upload Shopee Excel exports → Monthly SKU summary, anomalies, Top SKU, Pareto + Export Excel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
