import { SUPABASE_URL } from '@/lib/api';

// Helper utilities for authentication flow
// ------------------------------------------------
// Centralises Supabase OAuth URL construction and token handling.
// This keeps UI components clean and makes the workflow easier to test.

/**
 * Build the Supabase OAuth authorisation URL for a given provider.
 *
 * @param provider - "google" | "facebook"
 * @returns a fully‑qualified URL string that redirects the user to Supabase's
 *          hosted OAuth flow, which will eventually redirect back to
 *          `redirectUri` with `access_token` and `refresh_token` query params.
 */
export function getSupabaseAuthUrl(provider: "google" | "facebook", redirectUri: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const encodedRedirect = encodeURIComponent(redirectUri);
  // Supabase expects `provider` and `redirect_to` query params
  return `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodedRedirect}`;
}

/**
 * Wrapper around the existing token helpers to clear all auth‑related storage.
 * Use this on logout to guarantee no stale tokens remain.
 */
export function clearAllAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("lbdc_access_token");
    localStorage.removeItem("lbdc_refresh_token");
    localStorage.removeItem("lbdc_user");
  }
}
