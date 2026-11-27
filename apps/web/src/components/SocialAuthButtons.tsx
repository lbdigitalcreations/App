'use client';

import { useState } from 'react';
import { getSupabaseAuthUrl } from '@/lib/authUtils';

interface SocialAuthButtonsProps {
  mode?: 'register' | 'login';
  dividerText?: string;
  onError?: (err: string) => void;
}

const SUPABASE_PROJECT_REF = 'pnqzohzckfryffgypzux';
const SUPABASE_URL = 'https://pnqzohzckfryffgypzux.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBucXpvaHpja2ZyeWZmZ3lwenV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NjQ4OTYsImV4cCI6MjExMTI0MDg5Nn0.0KydHH0gLSNyI85vZ_RPvzvHH3-7zKKneQVxrZOJlGI';

export function SocialAuthButtons({
  mode = 'register',
  dividerText = 'or continue with email',
  onError,
}: SocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [setupModal, setSetupModal] = useState<{ provider: 'Google' | 'Facebook' } | null>(null);

  const checkProviderEnabled = async (provider: 'google' | 'facebook'): Promise<boolean> => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: SUPABASE_ANON_KEY },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.external?.[provider];
    } catch {
      return false;
    }
  };

  // Unified login handler for both providers
  const handleProviderLogin = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    try {
      const isEnabled = await checkProviderEnabled(provider);
      if (!isEnabled) {
        setSetupModal({ provider: provider === 'google' ? 'Google' : 'Facebook' });
        return;
      }
      const redirectUri = `${window.location.origin}/dashboard`;
      const authUrl = getSupabaseAuthUrl(provider, redirectUri);
      window.location.href = authUrl;
    } catch (err: any) {
      if (onError) onError(err.message || 'Authentication failed');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="w-full">
      {/* Provider Setup Guide Modal */}
      {setupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-sand bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <div className="flex items-center space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600 font-bold">!</span>
                <h3 className="font-serif text-lg font-bold text-ink">
                  {setupModal.provider} Provider Setup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSetupModal(null)}
                className="text-stone-400 hover:text-ink text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-stone-600 leading-relaxed">
              <p>
                <strong>{setupModal.provider} OAuth</strong> is currently disabled in your Supabase backend.
              </p>
              <div className="rounded-xl bg-ivory p-3 border border-sand">
                <p className="font-semibold text-ink mb-1">To enable {setupModal.provider} login:</p>
                <ol className="list-decimal list-inside space-y-1 text-stone-600">
                  <li>Open your Supabase Project Dashboard.</li>
                  <li>Navigate to <strong>Authentication → Providers</strong>.</li>
                  <li>Click <strong>{setupModal.provider}</strong>, toggle <strong>Enable</strong>, and paste your Client ID & Secret.</li>
                  <li>Click <strong>Save</strong>.</li>
                </ol>
              </div>
              <p className="text-stone-500">
                In the meantime, you can sign in or register instantly using <strong>Email & Password</strong> or <strong>Phone OTP</strong> below.
              </p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <a
                href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center rounded-full bg-gold px-4 py-2.5 text-xs font-semibold text-white hover:bg-gold-dark transition shadow"
              >
                Open Supabase Providers →
              </a>
              <button
                type="button"
                onClick={() => setSetupModal(null)}
                className="rounded-full border border-sand px-4 py-2.5 text-xs font-semibold text-ink hover:bg-stone-50"
              >
                Continue with Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Google Button */}
        <button
          type="button"
          onClick={() => handleProviderLogin('google')}
          disabled={!!loadingProvider}
          className="flex items-center justify-center rounded-xl border border-sand bg-white py-2.5 px-4 text-xs font-semibold text-ink shadow-sm transition hover:bg-stone-50 hover:border-gold hover:shadow active:scale-[0.99] disabled:opacity-60"
        >
          <svg className="h-4 w-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{loadingProvider === 'google' ? 'Checking...' : 'Google'}</span>
        </button>

        {/* Facebook Button */}
        <button
          type="button"
          onClick={() => handleProviderLogin('facebook')}
          disabled={!!loadingProvider}
          className="flex items-center justify-center rounded-xl border border-sand bg-white py-2.5 px-4 text-xs font-semibold text-ink shadow-sm transition hover:bg-stone-50 hover:border-gold hover:shadow active:scale-[0.99] disabled:opacity-60"
        >
          <svg className="h-4 w-4 mr-2.5 flex-shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>{loadingProvider === 'facebook' ? 'Checking...' : 'Facebook'}</span>
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
