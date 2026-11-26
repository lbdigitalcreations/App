export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnqzohzckfryffgypzux.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBucXpvaHpja2ZyeWZmZ3lwenV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NjQ4OTYsImV4cCI6MjExMTI0MDg5Nn0.0KydHH0gLSNyI85vZ_RPvzvHH3-7zKKneQVxrZOJlGI';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lbdc_access_token');
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lbdc_access_token', accessToken);
  localStorage.setItem('lbdc_refresh_token', refreshToken);
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('lbdc_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lbdc_user', JSON.stringify(user));
}

export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lbdc_access_token');
  localStorage.removeItem('lbdc_refresh_token');
  localStorage.removeItem('lbdc_user');
}

/**
 * Parses OAuth tokens from the URL hash or query string when returning from Google/Facebook.
 */
export async function handleOAuthCallback(): Promise<any | null> {
  if (typeof window === 'undefined') return null;

  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  // 1. Check URL Hash: #access_token=...&refresh_token=...
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
  }

  // 2. Check URL Search Query: ?access_token=...
  if (!accessToken && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
  }

  if (!accessToken) return null;

  // Save tokens
  setAuthTokens(accessToken, refreshToken || accessToken);

  // Fetch verified user from Supabase
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const user = {
        id: data.id,
        email: data.email,
        profile: {
          fullName:
            data.user_metadata?.full_name ||
            data.user_metadata?.name ||
            data.email?.split('@')[0] ||
            'Customer',
          avatarUrl:
            data.user_metadata?.avatar_url ||
            data.user_metadata?.picture ||
            null,
          city: '',
        },
      };

      setStoredUser(user);

      // Clean URL hash so the address bar is clean
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      return user;
    }
  } catch (err) {
    console.error('Error fetching OAuth user from Supabase:', err);
  }

  // Fallback user if network fails
  const fallbackUser = {
    id: 'user_' + Date.now(),
    email: 'customer@lbdc.in',
    profile: {
      fullName: 'Valued Customer',
      avatarUrl: null,
      city: '',
    },
  };
  setStoredUser(fallbackUser);

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  return fallbackUser;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const reqHeaders: Record<string, string> = {
    ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      reqHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: reqHeaders,
  });

  if (res.status === 401 && auth && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('lbdc_refresh_token');
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        setAuthTokens(refreshed.accessToken, refreshed.refreshToken);
        reqHeaders.Authorization = `Bearer ${refreshed.accessToken}`;
        res = await fetch(`${API_BASE}${path}`, { ...rest, headers: reqHeaders });
      } else {
        clearAuthTokens();
      }
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(errBody.message)
        ? errBody.message.join(', ')
        : errBody.message || `Request failed (${res.status})`,
    );
  }

  return res.json();
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lbdc_admin_token');
}

export function setAdminToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lbdc_admin_token', token);
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lbdc_admin_token');
}

export async function adminFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(err.message) ? err.message.join(', ') : err.message || `Error ${res.status}`,
    );
  }
  return res.json();
}
