import type { ReactNode } from "react";

/**
 * Shared page masthead for the learner pages: small gold eyebrow, display-scale
 * title, optional supporting line, and a slot for actions on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-balance font-heading text-display-sm font-bold leading-tight text-heading">
          {title}
        </h1>
        {description && <p className="mt-3 max-w-xl leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </header>
  );
}
