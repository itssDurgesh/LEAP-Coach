import { fetchPricing } from "@/lib/payments/pricing";
import { PricingClient } from "./PricingClient";

// Render per-request so a price change in Admin → Plans & Coupons reflects immediately,
// and so the correct admin-set price is in the first server paint (no client-load flash).
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const initialPricing = await fetchPricing();
  return <PricingClient initialPricing={initialPricing} />;
}
