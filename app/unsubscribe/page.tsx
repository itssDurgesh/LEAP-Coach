import { UnsubscribeConfirm } from "./UnsubscribeConfirm";

export const metadata = { title: "Unsubscribe · LEAP Coach" };

/**
 * Public unsubscribe page (no auth). Reads the signed token from the URL and hands
 * it to a client confirm step. The actual opt-out happens on POST /api/unsubscribe.
 */
export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-hair bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="font-heading text-lg font-extrabold text-heading">
            LEAP <span className="text-gold-600">Coach</span>
          </span>
        </div>
        <UnsubscribeConfirm token={token} />
      </div>
    </main>
  );
}
