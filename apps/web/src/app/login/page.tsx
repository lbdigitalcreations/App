'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch, setAuthTokens } from '@/lib/api';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';

export default function LoginPage() {
  const [mode, setMode] = useState<'password' | 'otp' | 'reset'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthTokens(res.accessToken, res.refreshToken);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setError('');
    try {
      const res = await apiFetch('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setOtpSent(true);
      if (res.devOtp) setMessage(`Dev OTP: ${res.devOtp}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiFetch('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });
      setAuthTokens(res.accessToken, res.refreshToken);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiFetch('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResetSent(true);
      setMessage(
        res.devResetToken
          ? `Reset token (dev): ${res.devResetToken}`
          : 'If an account exists, reset instructions have been sent.',
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="lbdc-card p-8">
        <div className="text-center">
          <img src="/images/logo.jpg" alt="LBDC" className="mx-auto h-12 w-12 rounded-full border border-gold object-cover" />
          <h1 className="mt-4 font-serif text-3xl font-bold text-ink">Welcome Back</h1>
          <p className="mt-1 text-xs text-muted">Sign in to manage your celebration websites</p>
        </div>

        <div className="mt-6">
          <SocialAuthButtons mode="login" dividerText="or continue with" onError={(msg) => setError(msg)} />
        </div>

        <div className="flex rounded-full border border-sand bg-ivory p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex-1 rounded-full py-2 ${mode === 'password' ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setMode('otp')}
            className={`flex-1 rounded-full py-2 ${mode === 'otp' ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
          >
            Phone OTP
          </button>
          <button
            type="button"
            onClick={() => setMode('reset')}
            className={`flex-1 rounded-full py-2 ${mode === 'reset' ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
          >
            Reset
          </button>
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        {message && <div className="mt-4 rounded-xl bg-ivory border border-gold p-3 text-xs text-ink">{message}</div>}

        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
              />
            </div>
            <button disabled={loading} className="lbdc-btn-gold w-full rounded-full py-3 text-sm font-semibold">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted">Phone Number (+91...)</label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
              />
            </div>
            {!otpSent ? (
              <button type="button" onClick={handleRequestOtp} className="lbdc-btn-gold w-full rounded-full py-3 text-sm font-semibold">
                Send OTP
              </button>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted">6-Digit OTP</label>
                  <input
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  />
                </div>
                <button className="lbdc-btn-gold w-full rounded-full py-3 text-sm font-semibold">
                  Verify & Sign In
                </button>
              </>
            )}
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetRequest} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted">Account Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
              />
            </div>
            <button disabled={resetSent} className="lbdc-btn-gold w-full rounded-full py-3 text-sm font-semibold">
              Send Reset Instructions
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          New to LB Digital Creations?{' '}
          <Link href="/register" className="font-semibold text-gold-dark hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
