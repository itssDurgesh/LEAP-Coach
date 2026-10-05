"use client";

import * as React from "react";
import { ArrowRight, Check, Star } from "lucide-react";
import { CheckoutModal } from "@/components/CheckoutModal";
import { v2Button } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { ROLES, Role, upgradePrice, bundlePrice } from "@/lib/types";
import { activeCategories } from "@/lib/access";
import { cn, formatINR } from "@/lib/utils";

/**
 * Dashboard "Upgrade your plan" band. Same rules as UpgradePlanCard (only active
 * catalogs count as owned, the learner pays the difference, buying the last
 * missing category completes all-access) in the version 2 look. Hidden once the
 * learner has every category.
 */
export function UpgradeBand() {
  const { currentUser, pricing } = useApp();
  const [selected, setSelected] = React.useState<Role[]>([]);
  const [checkout, setCheckout] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(false);

  if (!currentUser) return null;
  const owned = activeCategories(currentUser);
  const missing = ROLES.filter((r) => !owned.has(r.id));
  if (missing.length === 0) return null;

  const toggle = (r: Role) => setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const price = selected.length ? upgradePrice(pricing, owned.size, selected.length) : 0;
  const buyingAll = selected.length === missing.length && selected.length > 0;
  const showExplainer = pricing.showUpgradeInfo !== false;
  const ownedCount = owned.size;
  const targetCount = Math.min(3, ownedCount + selected.length);
  const currentTierPrice = ownedCount > 0 ? bundlePrice(pricing, ownedCount) : 0;
  const targetTierPrice = bundlePrice(pricing, targetCount);

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-v2-navy p-7 shadow-v2-card sm:p-9">
      <span aria-hidden className="pointer-events-none absolute -right-[130px] -top-[200px] h-[280px] w-[280px] rounded-full bg-gold-400/15" />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-14">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-v2-navy-raised px-2.5 py-1 text-xs font-semibold text-gold-400">
            <Star className="h-3.5 w-3.5 fill-current" /> Upgrade your plan
          </span>
          <h2 className="mt-3 font-heading text-[26px] font-bold leading-[1.2] tracking-[-0.015em] text-white">
            Unlock every topic in another category
          </h2>
          <p className="mt-3 text-[15px] leading-6 text-v2-on-navy-muted">
            {ownedCount > 0
              ? `You already own ${ownedCount} of 3. You pay only the difference, and never again for a category you have.`
              : "Pick the categories you want. Each one unlocks every topic inside it."}
          </p>
        </div>

        <div className="w-full shrink-0 space-y-[18px] lg:w-[460px]">
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const isOwned = owned.has(r.id);
              const isSel = selected.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={isOwned}
                  aria-pressed={isSel}
                  onClick={() => toggle(r.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors duration-200",
                    isOwned
                      ? "cursor-default bg-v2-navy-raised text-v2-on-navy-muted"
                      : isSel
                        ? "bg-[#E9B93E] text-navy-800"
                        : "bg-v2-navy-raised text-white hover:bg-white/20",
                  )}
                >
                  {(isOwned || isSel) && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                  {r.label}
                  {isOwned && <span className="sr-only"> (owned)</span>}
                </button>
              );
            })}
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-white">
                {selected.length === 0 ? "Select a category" : buyingAll ? "Completes all-access" : ownedCount > 0 ? "You pay the difference" : `${selected.length} categor${selected.length > 1 ? "ies" : "y"}`}
              </p>
              {ownedCount > 0 && (
                <p className="mt-0.5 text-xs font-medium text-v2-on-navy-muted">
                  {ROLES.filter((r) => owned.has(r.id))
                    .map((r) => r.label)
                    .join(" and ")}{" "}
                  {ownedCount > 1 ? "are" : "is"} already yours
                </p>
              )}
            </div>
            {selected.length > 0 && <p className="font-heading text-[32px] font-bold leading-9 tracking-[-0.015em] text-white">{formatINR(price)}</p>}
          </div>

          {showExplainer && showInfo && (
            <div className="rounded-2xl bg-v2-navy-raised p-4 text-[13px] leading-5 text-v2-on-navy-muted">
              {selected.length === 0 ? (
                <p>Upgrades cost the difference between your current plan and the new one. Pick a category to see the exact sum.</p>
              ) : ownedCount === 0 ? (
                <p>
                  The {targetCount}-category price is <strong className="text-white">{formatINR(targetTierPrice)}</strong>.
                </p>
              ) : (
                <ul className="space-y-1">
                  <li className="flex justify-between gap-3">
                    <span>Your plan now ({ownedCount} of 3)</span>
                    <span className="text-white">{formatINR(currentTierPrice)}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>After upgrade ({targetCount} of 3)</span>
                    <span className="text-white">{formatINR(targetTierPrice)}</span>
                  </li>
                  <li className="flex justify-between gap-3 border-t border-white/15 pt-1 font-semibold text-white">
                    <span>You pay the difference</span>
                    <span>{formatINR(price)}</span>
                  </li>
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3.5">
            <button type="button" onClick={() => setCheckout(true)} disabled={!selected.length} className={v2Button("primary", "md", "flex-1")}>
              {selected.length ? `Upgrade for ${formatINR(price)}` : "Select a category"} <ArrowRight className="h-4 w-4" />
            </button>
            {showExplainer && (
              <button type="button" onClick={() => setShowInfo((v) => !v)} aria-expanded={showInfo} className={v2Button("ghostOnNavy", "md", "px-2")}>
                Why this price?
              </button>
            )}
          </div>
        </div>
      </div>

      <CheckoutModal
        open={checkout}
        bundleCategories={selected}
        onClose={() => setCheckout(false)}
        onComplete={() => {
          setSelected([]);
          setCheckout(false);
        }}
      />
    </section>
  );
}
