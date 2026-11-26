'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Calendar, Heart, Lock, MapPin, Share2, Sparkles } from 'lucide-react';
import { API_BASE, apiFetch } from '@/lib/api';

function PublicCelebrationSiteContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const [site, setSite] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  // RSVP & Wishes
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [attending, setAttending] = useState<'YES' | 'NO' | 'MAYBE'>('YES');
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [rsvpMsg, setRsvpMsg] = useState('');
  const [rsvpSuccess, setRsvpSuccess] = useState('');

  const [wishName, setWishName] = useState('');
  const [wishRelation, setWishRelation] = useState('');
  const [wishMessage, setWishMessage] = useState('');
  const [wishSuccess, setWishSuccess] = useState('');

  const loadSite = (pwd?: string) => {
    const qs = new URLSearchParams();
    if (isPreview) qs.set('preview', '1');
    if (pwd) qs.set('password', pwd);
    apiFetch(`/sites/public/${slug}?${qs.toString()}`)
      .then((res) => {
        setError('');
        setSite(res);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadSite();
  }, [slug]);

  useEffect(() => {
    const eventDate = site?.content?.eventDate;
    if (!eventDate) return;
    const target = new Date(eventDate).getTime();
    if (isNaN(target)) return;

    const timer = setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [site?.content?.eventDate]);

  const submitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRsvpSuccess('');
    await apiFetch(`/sites/public/${slug}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({
        guestName,
        guestPhone: guestPhone || undefined,
        attending,
        attendeeCount: Number(attendeeCount),
        message: rsvpMsg || undefined,
      }),
    });
    setGuestName('');
    setGuestPhone('');
    setRsvpMsg('');
    setRsvpSuccess('Thank you! Your RSVP has been recorded.');
  };

  const submitWish = async (e: React.FormEvent) => {
    e.preventDefault();
    setWishSuccess('');
    const created = await apiFetch(`/sites/public/${slug}/wishes`, {
      method: 'POST',
      body: JSON.stringify({
        guestName: wishName,
        relationship: wishRelation || undefined,
        message: wishMessage,
      }),
    });
    setSite((prev: any) => ({ ...prev, wishes: [created, ...(prev?.wishes || [])] }));
    setWishName('');
    setWishRelation('');
    setWishMessage('');
    setWishSuccess('Your blessing has been added to the wishes wall!');
  };

  if (error && !site) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="lbdc-card p-8">
          <h1 className="font-serif text-2xl font-bold text-ink">Celebration Website</h1>
          <p className="mt-3 text-sm text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return <div className="p-20 text-center text-sm text-muted">Loading celebration...</div>;
  }

  if (site.requiresPassword) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadSite(password);
          }}
          className="lbdc-card p-8 text-center space-y-4"
        >
          <Lock className="mx-auto h-8 w-8 text-gold-dark" />
          <h1 className="font-serif text-2xl font-bold text-ink">Private Celebration</h1>
          <p className="text-xs text-muted">Enter the guest password to view this celebration portal.</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Guest password"
            className="w-full rounded-xl border border-sand bg-ivory px-4 py-2.5 text-sm"
          />
          <button className="lbdc-btn-gold w-full rounded-full py-3 text-xs font-semibold">
            Unlock Celebration
          </button>
        </form>
      </div>
    );
  }

  const c = site.content || {};
  const accent = c.themeColor || '#C5A15A';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="bg-ivory min-h-screen pb-20">
      {isPreview && (
        <div className="bg-ink py-2 text-center text-xs font-semibold text-champagne">
          PREVIEW MODE — Unpublished Celebration Website
        </div>
      )}

      {/* Hero */}
      <section className="border-b border-sand bg-white py-20 text-center px-4">
        <div className="mx-auto max-w-3xl">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ borderColor: accent, color: accent }}
          >
            <Sparkles className="h-3.5 w-3.5" /> You Are Cordially Invited
          </span>
          <h1 className="mt-6 font-serif text-4xl font-bold text-ink sm:text-6xl">
            {c.celebrationTitle}
          </h1>
          <p className="mt-3 font-serif text-2xl italic" style={{ color: accent }}>
            {c.honoreeNames}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" style={{ color: accent }} />
              {c.eventDate} {c.eventTime ? `• ${c.eventTime}` : ''}
            </span>
            {c.venueName && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" style={{ color: accent }} />
                {c.venueName}
              </span>
            )}
          </div>
          {c.description && (
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink">
              {c.description}
            </p>
          )}

          {/* Countdown */}
          {c.countdownEnabled && c.eventDate && (
            <div className="mt-10 grid grid-cols-4 gap-3 max-w-md mx-auto">
              {[
                { label: 'Days', val: countdown.days },
                { label: 'Hours', val: countdown.hours },
                { label: 'Mins', val: countdown.mins },
                { label: 'Secs', val: countdown.secs },
              ].map((b) => (
                <div key={b.label} className="lbdc-card p-3 bg-ivory">
                  <p className="font-serif text-2xl font-bold text-ink">{b.val}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted">{b.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {c.mapsUrl && (
              <a
                href={c.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="lbdc-btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold"
              >
                <MapPin className="h-4 w-4" /> Open Venue in Google Maps
              </a>
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`You're invited to ${c.celebrationTitle}! ${shareUrl}`)}`}
              target="_blank"
              rel="noreferrer"
              className="lbdc-btn-outline inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold"
            >
              <Share2 className="h-4 w-4" /> Share on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pt-14 space-y-14">
        {/* Itinerary */}
        {Array.isArray(c.itinerary) && c.itinerary.length > 0 && (
          <section>
            <h2 className="text-center font-serif text-3xl font-bold text-ink">Event Schedule</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {c.itinerary.map((item: any, i: number) => (
                <div key={i} className="lbdc-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
                    {item.time}
                  </p>
                  <h3 className="mt-1 font-serif text-xl font-bold text-ink">{item.title}</h3>
                  {item.venue && <p className="mt-1 text-sm text-muted">{item.venue}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        {c.galleryEnabled && Array.isArray(c.galleryImages) && c.galleryImages.length > 0 && (
          <section>
            <h2 className="text-center font-serif text-3xl font-bold text-ink">Cherished Memories</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {c.galleryImages.map((img: any) => (
                <div key={img.id} className="lbdc-card overflow-hidden p-1.5">
                  <img
                    src={`${API_BASE.replace('/api/v1', '')}${img.url}`}
                    alt={img.name}
                    className="h-52 w-full rounded-xl object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RSVP & Wishes */}
        {site.guestInteractionsOn && (
          <section className="grid gap-8 lg:grid-cols-2">
            {c.rsvpEnabled && (
              <form onSubmit={submitRsvp} className="lbdc-card p-6 space-y-4">
                <h2 className="font-serif text-2xl font-bold text-ink">Kindly RSVP</h2>
                {rsvpSuccess && <p className="text-xs font-semibold text-emerald-700">{rsvpSuccess}</p>}
                <input
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your Full Name *"
                  className="w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                />
                <input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="Phone / WhatsApp (Optional)"
                  className="w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={attending}
                    onChange={(e) => setAttending(e.target.value as any)}
                    className="rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  >
                    <option value="YES">Joyfully Attending</option>
                    <option value="MAYBE">Tentative</option>
                    <option value="NO">Regretfully Unable</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(Number(e.target.value))}
                    className="rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  />
                </div>
                <textarea
                  rows={2}
                  value={rsvpMsg}
                  onChange={(e) => setRsvpMsg(e.target.value)}
                  placeholder="Note for the hosts (Optional)"
                  className="w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                />
                <button className="lbdc-btn-gold w-full rounded-full py-3 text-xs font-semibold">
                  Confirm RSVP
                </button>
              </form>
            )}

            {c.wishesEnabled && (
              <div className="lbdc-card p-6 space-y-4">
                <h2 className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
                  <Heart className="h-5 w-5 text-gold-dark" /> Guest Wishes
                </h2>
                <form onSubmit={submitWish} className="space-y-3">
                  {wishSuccess && <p className="text-xs font-semibold text-emerald-700">{wishSuccess}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      value={wishName}
                      onChange={(e) => setWishName(e.target.value)}
                      placeholder="Your Name *"
                      className="rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                    />
                    <input
                      value={wishRelation}
                      onChange={(e) => setWishRelation(e.target.value)}
                      placeholder="Relation (e.g., Friend)"
                      className="rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    required
                    rows={2}
                    value={wishMessage}
                    onChange={(e) => setWishMessage(e.target.value)}
                    placeholder="Write your heartfelt blessing..."
                    className="w-full rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                  />
                  <button className="lbdc-btn-outline rounded-full px-5 py-2 text-xs font-semibold">
                    Post Blessing
                  </button>
                </form>

                <div className="max-h-60 space-y-2 overflow-y-auto pt-2">
                  {(site.wishes || []).map((w: any) => (
                    <div key={w.id} className="rounded-xl border border-sand bg-ivory p-3 text-xs">
                      <p className="font-semibold text-ink">
                        {w.guestName} {w.relationship ? `(${w.relationship})` : ''}
                      </p>
                      <p className="mt-1 text-muted">{w.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* QR Code */}
        {site.qrCodeDataUrl && (
          <section className="text-center">
            <div className="lbdc-card inline-block p-6">
              <img src={site.qrCodeDataUrl} alt="Celebration QR Code" className="mx-auto h-36 w-36" />
              <p className="mt-2 text-xs font-medium text-muted">Scan to open this celebration portal</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function PublicCelebrationSitePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-sm text-muted">Loading celebration...</div>}>
      <PublicCelebrationSiteContent />
    </Suspense>
  );
}
