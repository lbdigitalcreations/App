import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('lbdc_access_token');
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('lbdc_access_token', accessToken);
  await SecureStore.setItemAsync('lbdc_refresh_token', refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync('lbdc_access_token');
  await SecureStore.deleteItemAsync('lbdc_refresh_token');
}

export async function mobileFetch<T = any>(
  path: string,
  options: RequestInit & { auth?: boolean; cacheKey?: string } = {},
): Promise<T> {
  const { auth = false, cacheKey, headers, ...rest } = options;
  const reqHeaders: Record<string, string> = {
    ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = await getToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: reqHeaders });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (cacheKey) {
      await AsyncStorage.setItem(`cache_${cacheKey}`, JSON.stringify(data));
    }
    return data;
  } catch (err) {
    if (cacheKey) {
      const cached = await AsyncStorage.getItem(`cache_${cacheKey}`);
      if (cached) return JSON.parse(cached);
    }
    throw err;
  }
}
