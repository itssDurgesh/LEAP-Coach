"use client";

import * as React from "react";
import { Crown, Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckoutModal } from "@/components/CheckoutModal";
import { useApp } from "@/lib/store/AppProvider";
import { ROLES, Role, bundlePrice } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

/**
 * Dashboard "Upgrade your plan" card. A learner who owns some category passes (or
 * none) can buy the categories they don't have yet — unlocking every topic inside
 * them. Reuses the existing bundle checkout (order → verify → grant); buying the
 * last missing category auto-promotes the account to all-access. Hidden once the
 * learner already has all-access or owns all three categories.
 */
export function UpgradePlanCard() {
  const { currentUser, pricing } = useApp();
  const [selected, setSelected] = React.useState<Role[]>([]);
  const [checkout, setCheckout] = React.useState(false);

  if (!currentUser) return null;
  const allAccess = currentUser.subscriptionPlan === "all_access";
  const owned = new Set<Role>(currentUser.ownedCategories ?? []);
  const missing = ROLES.filter((r) => !owned.has(r.id));

  // Already has everything → nothing to upgrade.
  if (allAccess || missing.length === 0) return null;

  const toggle = (r: Role) =>
    setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));

  const price = selected.length ? bundlePrice(pricing, selected.length) : 0;
  const buyingAll = selected.length === missing.length && selected.length > 0;

  return (
    <Card padded className="border-gold-200 bg-gradient-to-br from-gold-50 to-cream-50 dark:from-gold-500/10 dark:to-transparent">
      <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
        <Crown className="h-5 w-5 text-gold-600" /> Upgrade your plan
      </h3>
      <p className="mt-1 text-sm text-muted">
        Unlock every topic in another category.{" "}
        {owned.size > 0 ? `You already own ${owned.size} of 3.` : "Pick the categories you want."}
      </p>

      <div className="mt-3 space-y-2">
        {ROLES.map((r) => {
          const isOwned = owned.has(r.id);
          const isSel = selected.includes(r.id);
          return (
            <button
              key={r.id}
              disabled={isOwned}
              onClick={() => toggle(r.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors",
                isOwned
                  ? "cursor-default border-green-200 bg-green-50 dark:bg-green-500/10"
                  : isSel
                    ? "border-gold-400 bg-card"
                    : "border-hair bg-card hover:border-faint",
              )}
            >
              <span className="font-medium text-heading">{r.label}</span>
              {isOwned ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                  <Check className="h-3.5 w-3.5" /> Owned
                </span>
              ) : (
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full border-2",
                    isSel ? "border-gold-500 bg-gold-500 text-white" : "border-hair",
                  )}
                >
                  {isSel && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-muted">
            {buyingAll ? "Completes all-access" : `${selected.length} categor${selected.length > 1 ? "ies" : "y"}`}
          </span>
          <span className="font-heading text-lg font-bold text-heading">{formatINR(price)}</span>
        </div>
      )}

      <Button onClick={() => setCheckout(true)} disabled={!selected.length} className="mt-3 w-full">
        <Sparkles className="h-4 w-4" />
        {selected.length ? `Upgrade · ${formatINR(price)}` : "Select a category"}
      </Button>

      <CheckoutModal
        open={checkout}
        bundleCategories={selected}
        onClose={() => setCheckout(false)}
        onComplete={() => {
          setSelected([]);
          setCheckout(false);
        }}
      />
    </Card>
  );
}
