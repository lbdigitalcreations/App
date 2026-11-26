'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch, setAuthTokens } from '@/lib/api';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';

function RegisterForm() {
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          phone: phone || undefined,
          password,
          referralCode: referralCode || undefined,
        }),
      });
      setAuthTokens(res.accessToken, res.refreshToken);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="lbdc-card p-8">
        <div className="text-center">
          <img src="/images/logo.jpg" alt="LBDC" className="mx-auto h-12 w-12 rounded-full border border-gold object-cover" />
          <h1 className="mt-4 font-serif text-3xl font-bold text-ink">Create Account</h1>
          <p className="mt-1 text-xs text-muted">Start crafting your bespoke celebration website</p>
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</div>}

        <div className="mt-6">
          <SocialAuthButtons mode="register" dividerText="or continue with email" onError={(msg) => setError(msg)} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted">Full Name *</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Email *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">WhatsApp / Phone (+91...)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Password (min 8 chars, 1 uppercase, 1 number) *</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Referral Code (Optional)</label>
            <input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm uppercase"
            />
          </div>
          <button disabled={loading} className="lbdc-btn-gold w-full rounded-full py-3 text-sm font-semibold">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-gold-dark hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
