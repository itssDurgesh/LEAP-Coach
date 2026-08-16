import type { Metadata } from "next";
import { fetchPricing } from "@/lib/payments/pricing";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing & Plans",
  description:
    "LEAP Coach pricing for students, professionals, and entrepreneurs: pay per coaching topic or unlock full access to Prof. Vishal Gupta's leadership lessons.",
  alternates: { canonical: "/pricing" },
};

// Render per-request so a price change in Admin → Plans & Coupons reflects immediately,
// and so the correct admin-set price is in the first server paint (no client-load flash).
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const initialPricing = await fetchPricing();
  return <PricingClient initialPricing={initialPricing} />;
}
