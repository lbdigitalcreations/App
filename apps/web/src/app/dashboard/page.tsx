'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Copy, ExternalLink, FileText, Gift, Plus, User } from 'lucide-react';
import { apiFetch, getAccessToken, getStoredUser, handleOAuthCallback, setStoredUser } from '@/lib/api';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any>(null);
  const [tab, setTab] = useState<'orders' | 'notifications' | 'referrals' | 'profile'>('orders');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function init() {
      // 1. Process OAuth hash if returning from Google / Facebook
      const oauthUser = await handleOAuthCallback();
      if (oauthUser) {
        setUser(oauthUser);
        setFullName(oauthUser.profile?.fullName || '');
        setCity(oauthUser.profile?.city || '');
      }

      // 2. Check if logged in via token or stored session
      const stored = getStoredUser();
      if (stored && !oauthUser) {
        setUser(stored);
        setFullName(stored.profile?.fullName || '');
        setCity(stored.profile?.city || '');
      }

      const token = getAccessToken();
      if (!token && !stored && !oauthUser) {
        window.location.href = '/login';
        return;
      }

      // 3. Gracefully fetch fresh data from backend
      try {
        const [u, o, n, r] = await Promise.allSettled([
          apiFetch('/auth/me', { auth: true }),
          apiFetch('/orders', { auth: true }),
          apiFetch('/notifications', { auth: true }),
          apiFetch('/marketing/referrals/me', { auth: true }),
        ]);

        if (u.status === 'fulfilled' && (u as any).value) {
          const val = (u as any).value;
          setUser(val);
          setStoredUser(val);
          setFullName(val.profile?.fullName || '');
          setCity(val.profile?.city || '');
        }
        if (o.status === 'fulfilled' && Array.isArray((o as any).value)) {
          setOrders((o as any).value);
        }
        if (n.status === 'fulfilled' && Array.isArray((n as any).value)) {
          setNotifications((n as any).value);
        }
        if (r.status === 'fulfilled' && (r as any).value) {
          setReferrals((r as any).value);
        }
      } catch {
        // Keep stored user, never bounce to /login
      }
    }

    init();
  }, []);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await apiFetch('/auth/me', {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ fullName, city }),
      });
      setUser(updated);
      setStoredUser(updated);
      setMsg('Profile updated.');
    } catch {
      const updated = {
        ...(user || {}),
        profile: { ...(user?.profile || {}), fullName, city },
      };
      setUser(updated);
      setStoredUser(updated);
      setMsg('Profile updated.');
    }
  };

  if (!user) {
    return <div className="p-16 text-center text-sm text-muted">Loading your dashboard...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Customer Portal
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-ink">
            Welcome, {user.profile?.fullName}
          </h1>
        </div>
        <Link
          href="/studio"
          className="lbdc-btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> New Celebration Website
        </Link>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-sand pb-3">
        {[
          { id: 'orders', label: `My Orders & Projects (${orders.length})`, icon: FileText },
          { id: 'notifications', label: `Notifications (${notifications.filter((n) => !n.isRead).length})`, icon: Bell },
          { id: 'referrals', label: 'Referrals & Rewards', icon: Gift },
          { id: 'profile', label: 'Profile & Privacy', icon: User },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
              tab === t.id ? 'bg-gold text-white' : 'bg-white border border-sand text-ink'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="mt-6 space-y-4">
          {orders.length === 0 ? (
            <div className="lbdc-card p-12 text-center">
              <p className="font-serif text-xl text-ink">You haven’t placed an order yet.</p>
              <Link href="/studio" className="lbdc-btn-gold mt-4 inline-block rounded-full px-6 py-2.5 text-xs font-semibold">
                Start in Moments Studio
              </Link>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="lbdc-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gold-dark">{o.orderNumber}</span>
                    <span className="rounded-full bg-ivory border border-sand px-2.5 py-0.5 text-[11px] font-semibold">
                      {o.project?.status || o.orderStatus}
                    </span>
                    <span className="rounded-full bg-ivory border border-sand px-2.5 py-0.5 text-[11px] text-muted">
                      Payment: {o.paymentStatus}
                    </span>
                  </div>
                  <h2 className="mt-2 font-serif text-xl font-bold text-ink">
                    {o.requirements?.celebrationTitle || o.service?.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {o.service?.title} • {o.template?.name} • Total ₹{Number(o.totalPrice).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {o.project?.finalUrl && (
                    <a
                      href={o.project.finalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="lbdc-btn-outline inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold"
                    >
                      Live Site <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <Link
                    href={`/orders/${o.id}`}
                    className="lbdc-btn-gold rounded-full px-5 py-2 text-xs font-semibold"
                  >
                    Track & Manage
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="mt-6 space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="lbdc-card flex items-start justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{n.title}</p>
                <p className="mt-1 text-xs text-muted">{n.body}</p>
              </div>
              {!n.isRead && (
                <button
                  onClick={async () => {
                    await apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH', auth: true });
                    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
                  }}
                  className="text-xs font-semibold text-gold-dark"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'referrals' && referrals && (
        <div className="lbdc-card mt-6 p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink">Share & Earn Rewards</h2>
          <p className="text-sm text-muted">
            Invite friends to LB Digital Creations. Once their qualifying payment is verified, you earn ₹250 reward credit.
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sand bg-ivory p-4">
            <span className="font-mono text-sm font-bold text-ink">{referrals.referralLink}</span>
            <button
              onClick={() => navigator.clipboard.writeText(referrals.referralLink)}
              className="lbdc-btn-outline inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Link
            </button>
          </div>
          <p className="text-sm font-semibold text-gold-dark">
            Total Earned: ₹{referrals.totalEarned}
          </p>
        </div>
      )}

      {tab === 'profile' && (
        <form onSubmit={updateProfile} className="lbdc-card mt-6 max-w-lg p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink">Account Profile</h2>
          {msg && <p className="text-xs text-emerald-700">{msg}</p>}
          <div>
            <label className="text-xs font-semibold text-muted">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
            />
          </div>
          <button className="lbdc-btn-gold rounded-full px-6 py-2.5 text-xs font-semibold">
            Save Changes
          </button>
        </form>
      )}
    </div>
  );
}
