'use client';

import { useState } from 'react';
import { apiFetch, setAuthTokens } from '@/lib/api';

interface SocialAuthButtonsProps {
  mode?: 'register' | 'login';
  dividerText?: string;
  onError?: (err: string) => void;
}

export function SocialAuthButtons({
  mode = 'register',
  dividerText = 'or continue with email',
  onError,
}: SocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [notice, setNotice] = useState<string>('');

  const handleGoogleClick = async () => {
    setNotice('');
    setLoadingProvider('google');

    try {
      // 1. Check if Supabase or custom Google Client ID is configured in env
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnqzohzckfryffgypzux.supabase.co';

      if (googleClientId) {
        // Direct Google OAuth redirect
        const redirectUri = `${window.location.origin}/auth/callback?provider=google`;
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&response_type=token&scope=email%20profile`;
        window.location.href = googleAuthUrl;
        return;
      }

      // 2. Direct Supabase OAuth flow if configured
      if (supabaseUrl && supabaseUrl !== 'undefined') {
        const redirectUri = `${window.location.origin}/dashboard`;
        const supabaseOAuthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
          redirectUri,
        )}`;
        window.location.href = supabaseOAuthUrl;
        return;
      }

      // 3. Fallback info notice if client ID is still being set up in console
      setNotice('Google Sign-In is initializing. You can sign in using your email and password below.');
    } catch (err: any) {
      const msg = err.message || 'Google sign-in could not be completed';
      if (onError) onError(msg);
      else setNotice(msg);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleFacebookClick = async () => {
    setNotice('');
    setLoadingProvider('facebook');

    try {
      const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnqzohzckfryffgypzux.supabase.co';

      if (fbAppId) {
        const redirectUri = `${window.location.origin}/auth/callback?provider=facebook`;
        const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&scope=email,public_profile`;
        window.location.href = fbAuthUrl;
        return;
      }

      if (supabaseUrl && supabaseUrl !== 'undefined') {
        const redirectUri = `${window.location.origin}/dashboard`;
        const supabaseOAuthUrl = `${supabaseUrl}/auth/v1/authorize?provider=facebook&redirect_to=${encodeURIComponent(
          redirectUri,
        )}`;
        window.location.href = supabaseOAuthUrl;
        return;
      }

      setNotice('Facebook Sign-In is initializing. You can sign in using your email and password below.');
    } catch (err: any) {
      const msg = err.message || 'Facebook sign-in could not be completed';
      if (onError) onError(msg);
      else setNotice(msg);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="w-full">
      {notice && (
        <div className="mb-4 rounded-xl border border-sand bg-ivory p-3 text-xs text-ink/80 text-center">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Google Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={!!loadingProvider}
          className="flex items-center justify-center rounded-xl border border-sand bg-white py-2.5 px-4 text-xs font-semibold text-ink shadow-sm transition hover:bg-stone-50 hover:border-gold hover:shadow active:scale-[0.99] disabled:opacity-60"
        >
          <svg className="h-4 w-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loadingProvider === 'google' ? 'Connecting...' : 'Google'}</span>
        </button>

        {/* Facebook Button */}
        <button
          type="button"
          onClick={handleFacebookClick}
          disabled={!!loadingProvider}
          className="flex items-center justify-center rounded-xl border border-sand bg-white py-2.5 px-4 text-xs font-semibold text-ink shadow-sm transition hover:bg-stone-50 hover:border-gold hover:shadow active:scale-[0.99] disabled:opacity-60"
        >
          <svg className="h-4 w-4 mr-2.5 flex-shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>{loadingProvider === 'facebook' ? 'Connecting...' : 'Facebook'}</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-sand" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 font-medium text-muted">{dividerText}</span>
        </div>
      </div>
    </div>
  );
}
