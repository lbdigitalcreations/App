export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lbdc_access_token');
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lbdc_access_token', accessToken);
  localStorage.setItem('lbdc_refresh_token', refreshToken);
}

export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lbdc_access_token');
  localStorage.removeItem('lbdc_refresh_token');
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
