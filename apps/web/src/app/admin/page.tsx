'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  CreditCard,
  Download,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Layers,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';
import { API_BASE, adminFetch, clearAdminToken, getAdminToken, setAdminToken } from '@/lib/api';

type Section =
  | 'dashboard'
  | 'orders'
  | 'projects'
  | 'services'
  | 'templates'
  | 'packages'
  | 'payments'
  | 'websites'
  | 'customers'
  | 'marketing'
  | 'reports'
  | 'settings';

export default function AdminPortalPage() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [section, setSection] = useState<Section>('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [feedback, setFeedback] = useState('');

  // Quick create states
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponValue, setNewCouponValue] = useState('10');

  const loadSectionData = async (sec: Section) => {
    try {
      if (sec === 'dashboard') setDashboard(await adminFetch('/admin/dashboard'));
      if (sec === 'orders') setOrders(await adminFetch('/orders/admin/all'));
      if (sec === 'projects') setProjects(await adminFetch('/projects'));
      if (sec === 'services') setServices(await adminFetch('/catalog/services?includeInactive=true'));
      if (sec === 'templates') setTemplates(await adminFetch('/catalog/templates?includeInactive=true'));
      if (sec === 'packages') setPackages(await adminFetch('/catalog/packages?includeInactive=true'));
      if (sec === 'payments') setPayments(await adminFetch('/payments'));
      if (sec === 'websites') setWebsites(await adminFetch('/sites/admin/all'));
      if (sec === 'customers') setCustomers(await adminFetch('/admin/customers'));
      if (sec === 'marketing') {
        setCoupons(await adminFetch('/marketing/admin/coupons'));
        setReviews(await adminFetch('/marketing/admin/reviews'));
      }
      if (sec === 'settings') setSettings(await adminFetch('/admin/settings'));
    } catch (err: any) {
      setFeedback(err.message);
    }
  };

  useEffect(() => {
    if (getAdminToken()) {
      adminFetch('/auth/me')
        .then((u) => {
          if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') {
            clearAdminToken();
            return;
          }
          setAuthed(true);
          loadSectionData('dashboard');
        })
        .catch(() => clearAdminToken());
    }
  }, []);

  useEffect(() => {
    if (authed) loadSectionData(section);
  }, [section, authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await adminFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.user?.role !== 'ADMIN' && res.user?.role !== 'SUPER_ADMIN') {
        setAuthError('Access denied: Administrator privileges required.');
        return;
      }
      setAdminToken(res.accessToken);
      setAuthed(true);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={handleLogin} className="lbdc-card w-full max-w-md p-8 space-y-4">
          <div className="text-center">
            <img src="/images/logo.jpg" alt="LBDC" className="mx-auto h-12 w-12 rounded-full border border-gold object-cover" />
            <h1 className="mt-4 font-serif text-2xl font-bold text-ink">LBDC Admin Portal</h1>
            <p className="text-xs text-muted">Authorized Administrators Only</p>
          </div>
          {authError && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{authError}</p>}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin Email"
            className="w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
          />
          <button className="lbdc-btn-gold w-full rounded-full py-3 text-sm font-semibold">
            Sign In to Admin
          </button>
        </form>
      </div>
    );
  }

  const navItems: Array<{ id: Section; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'templates', label: 'Templates', icon: Sparkles },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'websites', label: 'Websites', icon: Globe },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'marketing', label: 'Marketing', icon: Tag },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-sand bg-white p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-sand">
            <img src="/images/logo.jpg" alt="LBDC" className="h-9 w-9 rounded-full border border-gold object-cover" />
            <div>
              <p className="font-serif text-sm font-bold text-ink">LBDC Admin</p>
              <p className="text-[10px] uppercase tracking-widest text-gold-dark">Control Center</p>
            </div>
          </div>
          <nav className="mt-5 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  section === item.id
                    ? 'bg-gold text-white'
                    : 'text-ink hover:bg-ivory'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={() => {
            clearAdminToken();
            setAuthed(false);
          }}
          className="flex items-center gap-2 rounded-xl border border-sand px-3 py-2 text-xs font-semibold text-muted hover:text-ink"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {feedback && (
          <div className="mb-4 rounded-xl border border-gold bg-white px-4 py-2 text-xs text-ink">
            {feedback}
          </div>
        )}

        {section === 'dashboard' && dashboard && (
          <div className="space-y-6">
            <h1 className="font-serif text-3xl font-bold text-ink">Executive Overview</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total Orders', val: dashboard.kpis.totalOrders },
                { label: 'New Orders', val: dashboard.kpis.newOrders },
                { label: 'Active Projects', val: dashboard.kpis.activeProjects },
                { label: 'Completed Projects', val: dashboard.kpis.completedProjects },
                { label: 'Total Customers', val: dashboard.kpis.totalCustomers },
                { label: 'Gross Revenue', val: `₹${dashboard.kpis.grossRevenue.toLocaleString('en-IN')}` },
                { label: 'Collected Payments', val: `₹${dashboard.kpis.collectedPayments.toLocaleString('en-IN')}` },
                { label: 'Outstanding Balances', val: `₹${dashboard.kpis.outstandingBalances.toLocaleString('en-IN')}` },
              ].map((kpi) => (
                <div key={kpi.label} className="lbdc-card p-5">
                  <p className="text-xs text-muted">{kpi.label}</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-ink">{kpi.val}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="lbdc-card p-6">
                <h2 className="font-serif text-lg font-bold">Order Status Breakdown</h2>
                <div className="mt-4 space-y-2 text-xs">
                  {dashboard.orderStatusGraph.map((g: any) => (
                    <div key={g.status} className="flex items-center justify-between border-b border-sand pb-2">
                      <span className="font-semibold">{g.status}</span>
                      <span className="rounded-full bg-ivory px-3 py-0.5 font-bold text-gold-dark">{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lbdc-card p-6">
                <h2 className="font-serif text-lg font-bold">Recent Audit Activities</h2>
                <div className="mt-4 space-y-2 text-xs max-h-60 overflow-y-auto">
                  {dashboard.recentActivities.map((a: any) => (
                    <div key={a.id} className="flex justify-between border-b border-sand pb-2">
                      <span className="font-medium">{a.action} ({a.entityType})</span>
                      <span className="text-muted">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'orders' && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold">Orders Management</h1>
            <div className="lbdc-card overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-sand bg-ivory">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Total / Paid</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-sand">
                      <td className="p-3 font-mono font-bold text-gold-dark">{o.orderNumber}</td>
                      <td className="p-3">{o.customerName}<br /><span className="text-muted">{o.customerEmail}</span></td>
                      <td className="p-3">{o.service?.title}</td>
                      <td className="p-3">₹{o.totalPrice} / ₹{o.amountPaid}</td>
                      <td className="p-3">{o.paymentStatus}</td>
                      <td className="p-3">{o.orderStatus}</td>
                      <td className="p-3 space-x-2">
                        <button
                          onClick={async () => {
                            await adminFetch(`/orders/admin/${o.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ orderStatus: 'ACCEPTED' }),
                            });
                            loadSectionData('orders');
                          }}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-white"
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            await adminFetch(`/orders/admin/${o.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ orderStatus: 'REJECTED' }),
                            });
                            loadSectionData('orders');
                          }}
                          className="rounded-full bg-red-600 px-3 py-1 text-white"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === 'projects' && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold">Projects & Preview Engine</h1>
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="lbdc-card p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs font-bold text-gold-dark">{p.referenceNumber}</p>
                    <h2 className="font-serif text-lg font-bold">{p.order?.requirements?.celebrationTitle || p.description}</h2>
                    <p className="text-xs text-muted">Status: {p.status} • Progress: {p.progressPercent}% • Payment: {p.order?.paymentStatus}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={async () => {
                        await adminFetch(`/projects/admin/${p.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: 'IN_PROGRESS', progressPercent: 45 }),
                        });
                        loadSectionData('projects');
                      }}
                      className="rounded-full border border-sand px-3 py-1.5 font-semibold"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={async () => {
                        const site = await adminFetch(`/sites/admin/projects/${p.id}/preview`, { method: 'POST', body: JSON.stringify({}) });
                        setFeedback(`Preview generated at /sites/${site.slug}?preview=1`);
                        loadSectionData('projects');
                      }}
                      className="lbdc-btn-gold rounded-full px-4 py-1.5 font-semibold"
                    >
                      Generate Preview Site
                    </button>
                    {p.celebrationSite && p.celebrationSite.status !== 'PUBLISHED' && (
                      <button
                        onClick={async () => {
                          await adminFetch(`/sites/admin/${p.celebrationSite.id}/publish`, { method: 'POST' });
                          setFeedback('Website published live!');
                          loadSectionData('projects');
                        }}
                        className="rounded-full bg-emerald-700 px-4 py-1.5 font-semibold text-white"
                      >
                        Publish Live
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'services' && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold">Services (Categories)</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <div key={s.id} className="lbdc-card p-5 space-y-2">
                  <div className="flex justify-between items-center">
                    <h2 className="font-serif text-lg font-bold">{s.title}</h2>
                    <span className="text-xs font-semibold text-gold-dark">₹{s.basePrice}</span>
                  </div>
                  <p className="text-xs text-muted">{s.description}</p>
                  <button
                    onClick={async () => {
                      await adminFetch(`/catalog/admin/services/${s.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: !s.isActive }),
                      });
                      loadSectionData('services');
                    }}
                    className="rounded-full border border-sand px-3 py-1 text-xs font-semibold"
                  >
                    {s.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'templates' && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold">Templates</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <div key={t.id} className="lbdc-card p-5 space-y-2">
                  <p className="text-[11px] text-gold-dark uppercase">{t.service?.title}</p>
                  <h2 className="font-serif text-lg font-bold">{t.name}</h2>
                  <p className="text-xs text-muted">{t.tagline}</p>
                  <button
                    onClick={async () => {
                      await adminFetch(`/catalog/admin/templates/${t.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: !t.isActive }),
                      });
                      loadSectionData('templates');
                    }}
                    className="rounded-full border border-sand px-3 py-1 text-xs font-semibold"
                  >
                    {t.isActive ? 'Set Inactive' : 'Set Active'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'packages' && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold">Packages</h1>
            <div className="grid gap-4 sm:grid-cols-3">
              {packages.map((p) => (
                <div key={p.id} className="lbdc-card p-5 space-y-2">
                  <h2 className="font-serif text-xl font-bold">{p.name}</h2>
                  <p className="font-serif text-2xl font-bold text-gold-dark">₹{p.price}</p>
                  <p className="text-xs text-muted">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'payments' && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold">Payments & Manual UPI Verification</h1>
            <div className="lbdc-card overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-sand bg-ivory">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Ref / UTR</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay) => (
                    <tr key={pay.id} className="border-b border-sand">
                      <td className="p-3 font-mono font-bold">{pay.order?.orderNumber}</td>
                      <td className="p-3">{pay.provider}</td>
                      <td className="p-3">{pay.paymentType}</td>
                      <td className="p-3">₹{pay.amount}</td>
                      <td className="p-3">{pay.upiReferenceId || pay.razorpayPaymentId || '—'}</td>
                      <td className="p-3 font-semibold">{pay.status}</td>
                      <td className="p-3 space-x-2">
                        {pay.provider === 'MANUAL_UPI' && pay.status === 'PENDING' && (
                          <>
                            <button
                              onClick={async () => {
                                await adminFetch(`/payments/admin/${pay.id}/verify-upi`, {
                                  method: 'POST',
                                  body: JSON.stringify({ approve: true }),
                                });
                                loadSectionData('payments');
                              }}
                              className="rounded-full bg-emerald-600 px-3 py-1 text-white"
                            >
                              Approve UPI
                            </button>
                            <button
                              onClick={async () => {
                                await adminFetch(`/payments/admin/${pay.id}/verify-upi`, {
                                  method: 'POST',
                                  body: JSON.stringify({ approve: false }),
                                });
                                loadSectionData('payments');
                              }}
                              className="rounded-full bg-red-600 px-3 py-1 text-white"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === 'websites' && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold">Celebration Websites</h1>
            <div className="space-y-3">
              {websites.map((w) => (
                <div key={w.id} className="lbdc-card p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-gold-dark">/sites/{w.slug}</p>
                    <h2 className="font-serif text-lg font-bold">{w.content?.celebrationTitle}</h2>
                    <p className="text-xs text-muted">Status: {w.status} • RSVPs: {w._count?.rsvps} • Wishes: {w._count?.wishes}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={async () => {
                        await adminFetch(`/sites/admin/${w.id}/status`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: w.status === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED' }),
                        });
                        loadSectionData('websites');
                      }}
                      className="rounded-full border border-sand px-3 py-1.5 font-semibold"
                    >
                      {w.status === 'PUBLISHED' ? 'Unpublish' : 'Set Published'}
                    </button>
                    <button
                      onClick={async () => {
                        await adminFetch(`/sites/admin/${w.id}/status`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: 'ARCHIVED' }),
                        });
                        loadSectionData('websites');
                      }}
                      className="rounded-full border border-sand px-3 py-1.5 text-muted"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'customers' && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold">Customers</h1>
            <div className="lbdc-card overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-sand bg-ivory">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Orders</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-sand">
                      <td className="p-3 font-semibold">{c.profile?.fullName}</td>
                      <td className="p-3">{c.email}</td>
                      <td className="p-3">{c.phone || '—'}</td>
                      <td className="p-3">{c._count?.orders ?? 0}</td>
                      <td className="p-3">{c.isActive ? 'Active' : 'Suspended'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === 'marketing' && (
          <div className="space-y-6">
            <h1 className="font-serif text-3xl font-bold">Marketing, Coupons & Reviews</h1>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await adminFetch('/marketing/admin/coupons', {
                  method: 'POST',
                  body: JSON.stringify({
                    code: newCouponCode,
                    discountType: 'PERCENT',
                    discountValue: Number(newCouponValue),
                  }),
                });
                setNewCouponCode('');
                loadSectionData('marketing');
              }}
              className="lbdc-card p-5 flex flex-wrap gap-3 items-end"
            >
              <div>
                <label className="text-xs text-muted">New Coupon Code</label>
                <input
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="FESTIVE15"
                  className="mt-1 block rounded-xl border border-sand bg-ivory px-3 py-2 text-xs uppercase"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Discount %</label>
                <input
                  required
                  type="number"
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(e.target.value)}
                  className="mt-1 block rounded-xl border border-sand bg-ivory px-3 py-2 text-xs w-24"
                />
              </div>
              <button className="lbdc-btn-gold rounded-full px-5 py-2 text-xs font-semibold">
                Create Coupon
              </button>
            </form>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="lbdc-card p-5 space-y-2">
                <h2 className="font-serif text-lg font-bold">Coupons</h2>
                {coupons.map((c) => (
                  <div key={c.id} className="flex justify-between text-xs border-b border-sand pb-2">
                    <span className="font-mono font-bold">{c.code}</span>
                    <span>{c.discountValue}{c.discountType === 'PERCENT' ? '%' : ' INR'} • Used {c.usedCount}</span>
                  </div>
                ))}
              </div>
              <div className="lbdc-card p-5 space-y-2">
                <h2 className="font-serif text-lg font-bold">Customer Reviews</h2>
                {reviews.map((r) => (
                  <div key={r.id} className="flex justify-between items-center text-xs border-b border-sand pb-2">
                    <div>
                      <p className="font-semibold">{r.customerName} ({r.rating}★)</p>
                      <p className="text-muted">{r.comment}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await adminFetch(`/marketing/admin/reviews/${r.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ isPublished: !r.isPublished }),
                        });
                        loadSectionData('marketing');
                      }}
                      className="rounded-full border border-sand px-3 py-1 font-semibold"
                    >
                      {r.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'reports' && (
          <div className="lbdc-card p-6 space-y-4">
            <h1 className="font-serif text-3xl font-bold">Business Reports & CSV Export</h1>
            <p className="text-sm text-muted">
              Download complete order, revenue, and payment collection reports as CSV.
            </p>
            <button
              onClick={() => {
                window.open(`${API_BASE}/admin/reports/export`, '_blank');
              }}
              className="lbdc-btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold"
            >
              <Download className="h-4 w-4" /> Export Orders & Revenue CSV
            </button>
          </div>
        )}

        {section === 'settings' && (
          <div className="lbdc-card p-6 space-y-4 max-w-2xl">
            <h1 className="font-serif text-3xl font-bold">Platform Settings</h1>
            <pre className="rounded-xl bg-ivory border border-sand p-4 text-xs overflow-x-auto">
              {JSON.stringify(settings, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
