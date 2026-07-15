import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Clerk attaches the session to requests so server routes (e.g. the payments
// verify handler) can read it via auth(). We do NOT protect routes here — the
// app does its own client-side gating in AppShell/AdminShell. When Clerk isn't
// configured (mock mode) the proxy is a no-op pass-through so the app still
// builds and runs without keys.
const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default hasClerk ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless referenced in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|otf|map|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
