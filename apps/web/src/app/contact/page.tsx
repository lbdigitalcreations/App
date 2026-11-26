'use client';

import { useState } from 'react';
import { LBDC_BRAND } from '@lbdc/shared';
import { apiFetch, getAccessToken } from '@/lib/api';

export default function ContactPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getAccessToken()) {
      await apiFetch('/orders/support/tickets', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ subject, message }),
      });
      setSent('Support ticket submitted! Our team will respond shortly.');
      setSubject('');
      setMessage('');
    } else {
      window.location.href = `mailto:${LBDC_BRAND.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 grid gap-10 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Get in Touch</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-ink">Contact LBDC</h1>
        <p className="mt-3 text-sm text-muted">
          Have a custom celebration idea or need assistance with an existing order?
        </p>
        <div className="mt-6 space-y-2 text-sm">
          <p><strong>Email:</strong> {LBDC_BRAND.email}</p>
          <p><strong>Phone / WhatsApp:</strong> {LBDC_BRAND.phone}</p>
          <p><strong>Instagram:</strong> @lb_digital_creations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="lbdc-card p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-ink">Send a Message</h2>
        {sent && <p className="text-xs font-semibold text-emerald-700">{sent}</p>}
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
        />
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className="w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
        />
        <button className="lbdc-btn-gold w-full rounded-full py-3 text-xs font-semibold">
          Send Message
        </button>
      </form>
    </div>
  );
}
