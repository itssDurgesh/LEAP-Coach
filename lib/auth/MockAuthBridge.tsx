"use client";

import * as React from "react";
import { AppProvider } from "@/lib/store/AppProvider";
import type { AuthBridge } from "./types";

// Mock backend: there is no real auth provider, so this is an inert bridge.
// AppProvider's mock path handles sign-in/up directly against its seeded user
// list and never calls these methods.
const mockAuth: AuthBridge = {
  isLoaded: true,
  userId: null,
  identity: null,
  getToken: async () => null,
  async signInWithPassword() {
    return { ok: false, error: "Use the in-app demo sign-in." };
  },
  async signUp() {
    return { ok: false, error: "Use the in-app demo sign-up." };
  },
  async verifyEmailCode() {
    return { ok: true };
  },
  async resendEmailCode() {
    return { ok: true };
  },
  async signInOAuth() {
    return { ok: false };
  },
  async signOut() {
    /* handled in-state by AppProvider */
  },
};

/** Auth backend used when Clerk isn't configured (localStorage demo mode). */
export function MockAuthBridge({ children }: { children: React.ReactNode }) {
  return <AppProvider auth={mockAuth}>{children}</AppProvider>;
}
