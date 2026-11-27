import { NextResponse } from 'next/server';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnqzohzckfryffgypzux.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBucXpvaHpja2ZyeWZmZ3lwenV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NjQ4OTYsImV4cCI6MjExMTI0MDg5Nn0.0KydHH0gLSNyI85vZ_RPvzvHH3-7zKKneQVxrZOJlGI';

export async function supabaseAuthFetch(
  path: string,
  options: RequestInit & { token?: string } = {},
) {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function formatSupabaseUser(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    phone: user.phone || user.user_metadata?.phone || null,
    profile: {
      fullName:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Customer',
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      city: user.user_metadata?.city || '',
      state: user.user_metadata?.state || '',
      country: user.user_metadata?.country || 'India',
    },
  };
}

export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s()-]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
}

export function supabaseErrorResponse(data: any, fallbackMessage: string, status = 400) {
  const message =
    data?.msg || data?.error_description || data?.message || data?.error || fallbackMessage;
  return NextResponse.json({ message }, { status });
}
