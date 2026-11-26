'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Menu, Sparkles, User, X } from 'lucide-react';
import { apiFetch, clearAuthTokens, getAccessToken } from '@/lib/api';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    apiFetch('/auth/me', { auth: true })
      .then((u) => {
        setUser(u);
        return apiFetch('/notifications', { auth: true });
      })
      .then((list) => {
        if (Array.isArray(list)) {
          setUnreadCount(list.filter((n: any) => !n.isRead).length);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', auth: true, body: JSON.stringify({}) });
    } catch {}
    clearAuthTokens();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/images/logo.jpg"
            alt="LB Digital Creations"
            className="h-10 w-10 rounded-full border border-gold object-cover"
          />
          <div>
            <span className="block font-serif text-lg font-semibold tracking-tight text-ink">
              LB Digital Creations
            </span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-gold-dark">
              Celebration Portals
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink md:flex">
          <Link href="/services" className="hover:text-gold-dark transition-colors">
            Services
          </Link>
          <Link href="/templates" className="hover:text-gold-dark transition-colors">
            Templates
          </Link>
          <Link href="/studio" className="inline-flex items-center gap-1.5 text-gold-dark hover:text-ink transition-colors">
            <Sparkles className="h-4 w-4" />
            Moments Studio
          </Link>
          <Link href="/pricing" className="hover:text-gold-dark transition-colors">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-gold-dark transition-colors">
            About
          </Link>
          <Link href="/contact" className="hover:text-gold-dark transition-colors">
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="relative rounded-full border border-sand p-2 text-ink hover:border-gold"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-sand bg-ivory px-4 py-2 text-sm font-medium text-ink hover:border-gold"
              >
                <User className="h-4 w-4 text-gold-dark" />
                <span>{user.profile?.fullName?.split(' ')[0] || 'Dashboard'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-muted hover:text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:text-gold-dark"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="lbdc-btn-gold rounded-full px-5 py-2 text-sm font-semibold shadow-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-lg border border-sand p-2 text-ink md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-sand bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium">
            <Link href="/services" onClick={() => setOpen(false)}>Services</Link>
            <Link href="/templates" onClick={() => setOpen(false)}>Templates</Link>
            <Link href="/studio" onClick={() => setOpen(false)}>Moments Studio</Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
            <Link href="/about" onClick={() => setOpen(false)}>About</Link>
            <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
            <hr className="border-sand" />
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="text-gold-dark font-semibold">
                  My Dashboard
                </Link>
                <button onClick={handleLogout} className="text-left text-muted">Sign out</button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link href="/login" onClick={() => setOpen(false)} className="lbdc-btn-outline flex-1 rounded-full py-2 text-center">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="lbdc-btn-gold flex-1 rounded-full py-2 text-center">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
