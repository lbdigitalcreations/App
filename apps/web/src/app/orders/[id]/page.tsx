'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, CreditCard, Download, ExternalLink, MessageSquarePlus } from 'lucide-react';
import { API_BASE, apiFetch, getAccessToken } from '@/lib/api';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [upiRef, setUpiRef] = useState('');
  const [revSection, setRevSection] = useState('Hero & Title');
  const [revDesc, setRevDesc] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  const loadOrder = () => {
    apiFetch(`/orders/${id}`, { auth: true })
      .then(setOrder)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = '/login';
      return;
    }
    loadOrder();
  }, [id]);

  const handleRazorpayPay = async (paymentType: 'ADVANCE' | 'BALANCE') => {
    setError('');
    try {
      const rzp = await apiFetch('/payments/razorpay/order', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ orderId: order.id, paymentType }),
      });
      setStatusMsg(`Razorpay Order ${rzp.razorpayOrderId} initialized for ₹${rzp.amount / 100}.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleManualUpi = async (e: React.FormEvent, paymentType: 'ADVANCE' | 'BALANCE') => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/payments/manual-upi', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          orderId: order.id,
          paymentType,
          upiReferenceId: upiRef,
        }),
      });
      setUpiRef('');
      setStatusMsg('Manual UPI reference submitted! Awaiting admin verification.');
      loadOrder();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApprovePreview = async () => {
    setError('');
    try {
      await apiFetch(`/projects/${order.project.id}/approve`, { method: 'POST', auth: true });
      setStatusMsg('Preview approved!');
      loadOrder();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/projects/${order.project.id}/revisions`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ section: revSection, description: revDesc, referenceAssetIds: [] }),
      });
      setRevDesc('');
      setStatusMsg('Revision request submitted!');
      loadOrder();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!order) return <div className="p-16 text-center text-sm text-muted">Loading order details...</div>;

  const project = order.project;
  const paymentTypeNeeded = Number(order.amountPaid) < Number(order.advanceAmount) ? 'ADVANCE' : 'BALANCE';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold text-gold-dark">{order.orderNumber}</span>
          <h1 className="mt-1 font-serif text-3xl font-bold text-ink">
            {order.requirements?.celebrationTitle}
          </h1>
          <p className="text-xs text-muted">
            Project Ref: {project?.referenceNumber} • Status: {project?.status} ({project?.progressPercent}%)
          </p>
        </div>
        {project?.previewUrl && (
          <a
            href={project.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="lbdc-btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold"
          >
            Open Preview <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {statusMsg && <div className="rounded-xl border border-gold bg-white p-3 text-sm text-ink">{statusMsg}</div>}
      {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Payment Breakdown & Settlement */}
      <div className="lbdc-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-ink">Payment & Invoices</h2>
          <span className="rounded-full border border-sand bg-ivory px-3 py-1 text-xs font-semibold">
            {order.paymentStatus}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div className="rounded-xl bg-ivory p-4 border border-sand">
            <p className="text-xs text-muted">Total Price</p>
            <p className="mt-1 font-serif text-xl font-bold">₹{Number(order.totalPrice).toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-xl bg-ivory p-4 border border-sand">
            <p className="text-xs text-muted">Amount Paid</p>
            <p className="mt-1 font-serif text-xl font-bold text-emerald-700">₹{Number(order.amountPaid).toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-xl bg-ivory p-4 border border-sand">
            <p className="text-xs text-muted">Remaining Balance</p>
            <p className="mt-1 font-serif text-xl font-bold text-gold-dark">₹{Number(order.balanceAmount).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {Number(order.balanceAmount) > 0 && (
          <div className="grid gap-4 border-t border-sand pt-4 sm:grid-cols-2">
            <button
              onClick={() => handleRazorpayPay(paymentTypeNeeded)}
              className="lbdc-btn-gold inline-flex items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold"
            >
              <CreditCard className="h-4 w-4" /> Pay {paymentTypeNeeded} via Razorpay
            </button>
            <form onSubmit={(e) => handleManualUpi(e, paymentTypeNeeded)} className="flex gap-2">
              <input
                required
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                placeholder="Enter UPI UTR / Ref ID"
                className="flex-1 rounded-full border border-sand bg-ivory px-4 py-2 text-xs"
              />
              <button className="lbdc-btn-outline rounded-full px-4 py-2 text-xs font-semibold">
                Submit UPI
              </button>
            </form>
          </div>
        )}

        {order.invoices?.length > 0 && (
          <div className="border-t border-sand pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted">Invoices</p>
            {order.invoices.map((inv: any) => (
              <a
                key={inv.id}
                href={`${API_BASE}/payments/invoices/${inv.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mr-3 rounded-full border border-sand bg-ivory px-4 py-1.5 text-xs font-semibold text-ink hover:border-gold"
              >
                <Download className="h-3.5 w-3.5 text-gold-dark" /> {inv.invoiceNumber} (PDF)
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Preview Approval & Revisions */}
      {project && (
        <div className="lbdc-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-bold text-ink">Project Progress & Revisions</h2>
            {project.status === 'PREVIEW_READY' && (
              <button
                onClick={handleApprovePreview}
                className="lbdc-btn-gold inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve Final Preview
              </button>
            )}
          </div>

          <form onSubmit={handleRevisionSubmit} className="space-y-3 rounded-xl border border-sand bg-ivory p-4">
            <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <MessageSquarePlus className="h-4 w-4 text-gold-dark" /> Request a Revision (Unlimited Before Approval)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={revSection}
                onChange={(e) => setRevSection(e.target.value)}
                className="rounded-xl border border-sand bg-white px-3 py-2 text-xs"
              >
                <option>Hero & Title</option>
                <option>Photo Gallery</option>
                <option>Event Itinerary</option>
                <option>Venue & Maps</option>
                <option>Colors & Typography</option>
              </select>
              <input
                required
                minLength={10}
                value={revDesc}
                onChange={(e) => setRevDesc(e.target.value)}
                placeholder="Describe the changes you'd like..."
                className="sm:col-span-2 rounded-xl border border-sand bg-white px-3 py-2 text-xs"
              />
            </div>
            <button className="lbdc-btn-outline rounded-full px-4 py-2 text-xs font-semibold">
              Submit Revision Request
            </button>
          </form>

          {project.revisions?.length > 0 && (
            <div className="space-y-2">
              {project.revisions.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-sand p-3 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>#{r.revisionNumber} — {r.section}</span>
                    <span className="text-gold-dark">{r.status}</span>
                  </div>
                  <p className="mt-1 text-muted">{r.description}</p>
                  {r.adminRemarks && <p className="mt-1 text-ink">Admin: {r.adminRemarks}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
