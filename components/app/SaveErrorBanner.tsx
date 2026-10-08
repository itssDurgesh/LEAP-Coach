"use client";

import { AlertTriangle, X } from "lucide-react";
import { useApp } from "@/lib/store/AppProvider";

/**
 * Shown when a change the screen has already applied was refused by, or never
 * reached, the database (see `fire` in AppProvider). Until then such a change just
 * vanished on the next reload with no sign anything had gone wrong. It stays until
 * dismissed: reloading is how the page gets back to what was really saved.
 */
export function SaveErrorBanner() {
  const { saveError, dismissSaveError } = useApp();
  if (!saveError) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-[200] mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl bg-navy-900 p-4 font-sans text-sm text-white shadow-lift ring-1 ring-white/10"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-gold-400" />
      <p className="min-w-0 flex-1 basis-56 leading-5">{saveError}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-full bg-[#E9B93E] px-4 py-1.5 text-xs font-semibold text-navy-900 transition-colors duration-200 hover:bg-[#F4CB5B]"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={dismissSaveError}
        aria-label="Dismiss"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
