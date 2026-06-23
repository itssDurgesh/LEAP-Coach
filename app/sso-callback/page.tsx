"use client";

import * as React from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { isClerkConfigured } from "@/lib/clerk/config";

// Clerk redirects here after Google sign-in. The callback component
// finishes the handshake and forwards to /select-role. It must run client-side
// inside <ClerkProvider> (real mode only) — never during SSR/prerender, hence the
// mounted + isClerkConfigured guards.
export default function SSOCallbackPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
      {mounted && isClerkConfigured && (
        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl="/select-role"
          signUpForceRedirectUrl="/select-role"
        />
      )}
    </div>
  );
}
