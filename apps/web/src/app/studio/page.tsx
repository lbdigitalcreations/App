'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, Plus, Save, Sparkles, Trash2, Upload } from 'lucide-react';
import { calculateOrderPricing } from '@lbdc/shared';
import { API_BASE, apiFetch, getAccessToken } from '@/lib/api';

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  const [draftId, setDraftId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState(searchParams.get('serviceId') || '');
  const [templateId, setTemplateId] = useState(searchParams.get('templateId') || '');
  const [packageId, setPackageId] = useState(searchParams.get('packageId') || '');

  const [celebrationTitle, setCelebrationTitle] = useState('');
  const [honoreeNames, setHonoreeNames] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [description, setDescription] = useState('');
  const [themeColor, setThemeColor] = useState('#C5A15A');
  const [animationStyle, setAnimationStyle] = useState('elegant-fade');
  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [galleryEnabled, setGalleryEnabled] = useState(true);
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [wishesEnabled, setWishesEnabled] = useState(true);
  const [itinerary, setItinerary] = useState<Array<{ title: string; time: string; venue: string }>>([]);

  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ id: string; originalName: string; signedUrl: string }>>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');

  const [previewMode, setPreviewMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/catalog/services'),
      apiFetch('/catalog/templates'),
      apiFetch('/catalog/packages'),
    ]).then(([svcs, tpls, pkgs]) => {
      setServices(svcs);
      setTemplates(tpls);
      setPackages(pkgs);
      if (!serviceId && svcs[0]) setServiceId(svcs[0].id);
      if (!packageId && pkgs[1]) setPackageId(pkgs[1].id);
      else if (!packageId && pkgs[0]) setPackageId(pkgs[0].id);
    });

    if (getAccessToken()) {
      apiFetch('/auth/me', { auth: true })
        .then((u) => {
          setCustomerName(u.profile?.fullName || '');
          setCustomerEmail(u.email || '');
          setCustomerPhone(u.phone || '');
        })
        .catch(() => {});

      apiFetch('/studio/drafts', { auth: true })
        .then((drafts) => {
          if (drafts?.[0]) {
            const d = drafts[0];
            setDraftId(d.id);
            const p = d.payload || {};
            if (p.celebrationTitle) setCelebrationTitle(p.celebrationTitle);
            if (p.honoreeNames) setHonoreeNames(p.honoreeNames);
            if (p.eventDate) setEventDate(p.eventDate);
            if (p.venueName) setVenueName(p.venueName);
            if (p.description) setDescription(p.description);
            if (Array.isArray(p.itinerary)) setItinerary(p.itinerary);
          }
        })
        .catch(() => {});
    }
  }, []);

  const filteredTemplates = templates.filter((t) => !serviceId || t.serviceId === serviceId);
  useEffect(() => {
    if (filteredTemplates.length > 0 && !filteredTemplates.some((t) => t.id === templateId)) {
      setTemplateId(filteredTemplates[0].id);
    }
  }, [serviceId, templates]);

  const saveDraft = async (silent = false) => {
    if (!getAccessToken()) return;
    try {
      const res = await apiFetch('/studio/drafts', {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          id: draftId,
          serviceId,
          templateId,
          packageId,
          payload: {
            celebrationTitle,
            honoreeNames,
            eventDate,
            eventTime,
            venueName,
            venueAddress,
            mapsUrl,
            description,
            themeColor,
            animationStyle,
            itinerary,
          },
        }),
      });
      setDraftId(res.id);
      if (!silent) setSaveStatus('Draft saved (not yet published)');
    } catch {}
  };

  // Autosave every 15s when authenticated and title entered
  useEffect(() => {
    if (!celebrationTitle || !getAccessToken()) return;
    const timer = setTimeout(() => saveDraft(true), 15000);
    return () => clearTimeout(timer);
  }, [celebrationTitle, honoreeNames, eventDate, venueName, description, itinerary]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!getAccessToken()) {
      setError('Please sign in to upload media files.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds 25 MB limit.');
      return;
    }
    setError('');
    setUploadProgress(`Uploading ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await apiFetch('/media/upload?category=PHOTO', {
        method: 'POST',
        auth: true,
        body: formData,
      });
      setUploadedPhotos((prev) => [...prev, uploaded]);
      setUploadProgress(null);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploadProgress(null);
    }
  };

  const handleRemoveUpload = async (assetId: string) => {
    try {
      await apiFetch(`/media/${assetId}`, { method: 'DELETE', auth: true });
      setUploadedPhotos((prev) => prev.filter((p) => p.id !== assetId));
    } catch {}
  };

  const handleAiCopy = async () => {
    if (!getAccessToken()) {
      setError('Please sign in to use the AI Celebration Assistant.');
      return;
    }
    try {
      const svc = services.find((s) => s.id === serviceId);
      const res = await apiFetch('/ai/suggest', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          feature: 'celebration_message',
          category: svc?.title,
          honoreeNames,
          eventDate,
        }),
      });
      setDescription(res.editableSuggestion);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const selectedPackage = packages.find((p) => p.id === packageId);
  const pricing = calculateOrderPricing({
    basePrice: Number(selectedPackage?.price || 0),
    discountAmount: couponDiscount,
    advancePercent: 50,
  });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!getAccessToken()) {
      setError('Sign in to apply a coupon code.');
      return;
    }
    try {
      const res = await apiFetch('/orders/validate-coupon', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          code: couponCode,
          subtotal: Number(selectedPackage?.price || 0),
        }),
      });
      setCouponDiscount(res.discountAmount);
      setCouponMsg(`Applied ${res.code}: -₹${res.discountAmount}`);
    } catch (err: any) {
      setCouponDiscount(0);
      setCouponMsg(err.message);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getAccessToken()) {
      router.push('/login?redirect=/studio');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          serviceId,
          templateId,
          packageId,
          selectedAddOnIds: [],
          couponCode: couponDiscount > 0 ? couponCode : undefined,
          customerName,
          customerEmail,
          customerPhone,
          customization: {
            serviceId,
            templateId,
            packageId,
            celebrationTitle,
            honoreeNames,
            eventDate,
            eventTime,
            venueName,
            venueAddress,
            mapsUrl,
            description,
            themeColor,
            animationStyle,
            countdownEnabled,
            galleryEnabled,
            rsvpEnabled,
            wishesEnabled,
            itinerary,
            photoAssetIds: uploadedPhotos.map((p) => p.id),
            videoAssetIds: [],
          },
        }),
      });
      router.push(`/orders/${res.order.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not submit order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Interactive Customizer
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-ink">Moments Studio</h1>
          <p className="mt-1 text-xs text-muted">
            Drafts are saved privately. Your celebration website is published only after preview approval & full payment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => saveDraft(false)}
            className="lbdc-btn-outline inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
          >
            <Save className="h-3.5 w-3.5" /> Save Draft
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="lbdc-btn-gold inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
          >
            <Eye className="h-3.5 w-3.5" /> {previewMode ? 'Edit Mode' : 'Live Preview'}
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="mt-4 rounded-xl border border-champagne bg-white px-4 py-2 text-xs text-gold-dark">
          {saveStatus}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {previewMode ? (
        <div className="lbdc-card mt-8 overflow-hidden p-8 text-center" style={{ borderColor: themeColor }}>
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: themeColor }}>
            Draft Preview (Unpublished)
          </p>
          <h2 className="mt-3 font-serif text-4xl font-bold text-ink">
            {celebrationTitle || 'Your Celebration Title'}
          </h2>
          <p className="mt-2 font-serif text-2xl italic text-gold-dark">
            {honoreeNames || 'Honoree Names'}
          </p>
          <p className="mt-4 text-sm text-muted">
            {eventDate || 'Event Date'} {eventTime ? `• ${eventTime}` : ''} {venueName ? `• ${venueName}` : ''}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-ink">
            {description || 'Your celebration story and invitation message will appear here.'}
          </p>
          {uploadedPhotos.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {uploadedPhotos.map((p) => (
                <img
                  key={p.id}
                  src={`${API_BASE.replace('/api/v1', '')}${p.signedUrl}`}
                  alt={p.originalName}
                  className="h-32 w-full rounded-xl object-cover border border-sand"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmitOrder} className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Step 1: Category, Template, Package */}
            <div className="lbdc-card p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold text-ink">1. Occasion, Template & Package</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-muted">Category</label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Template</label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  >
                    {filteredTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Package</label>
                  <select
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  >
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{Number(p.price).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Event Details */}
            <div className="lbdc-card p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold text-ink">2. Celebration & Venue Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted">Celebration Title *</label>
                  <input
                    required
                    value={celebrationTitle}
                    onChange={(e) => setCelebrationTitle(e.target.value)}
                    placeholder="e.g., Aarav & Diya Wedding"
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Honoree / Couple Names *</label>
                  <input
                    required
                    value={honoreeNames}
                    onChange={(e) => setHonoreeNames(e.target.value)}
                    placeholder="e.g., Aarav & Diya"
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Event Date *</label>
                  <input
                    required
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Event Time</label>
                  <input
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="e.g., 6:30 PM IST"
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Venue Name</label>
                  <input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g., Taj Coromandel, Chennai"
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Google Maps Link</label>
                  <input
                    type="url"
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted">Invitation Story / Message</label>
                  <button
                    type="button"
                    onClick={handleAiCopy}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Suggest with AI
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share your story or invitation message..."
                  className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted">Theme Accent Color</label>
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-sand bg-ivory p-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">Opening Animation</label>
                  <select
                    value={animationStyle}
                    onChange={(e) => setAnimationStyle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm"
                  >
                    <option value="elegant-fade">Elegant Fade</option>
                    <option value="royal-curtain">Royal Curtain</option>
                    <option value="floral-drift">Floral Drift</option>
                    <option value="sparkle-reveal">Sparkle Reveal</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2 text-xs font-medium text-ink">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={countdownEnabled} onChange={(e) => setCountdownEnabled(e.target.checked)} />
                  Countdown Timer
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={galleryEnabled} onChange={(e) => setGalleryEnabled(e.target.checked)} />
                  Photo Gallery
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={rsvpEnabled} onChange={(e) => setRsvpEnabled(e.target.checked)} />
                  Guest RSVP
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={wishesEnabled} onChange={(e) => setWishesEnabled(e.target.checked)} />
                  Wishes Wall
                </label>
              </div>
            </div>

            {/* Step 3: Media Upload */}
            <div className="lbdc-card p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold text-ink">3. Upload Memories (Photos / Videos)</h2>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sand bg-ivory p-6 text-center hover:border-gold">
                <Upload className="h-6 w-6 text-gold-dark" />
                <span className="mt-2 text-sm font-medium text-ink">
                  Click to upload JPEG, PNG, WebP or MP4 (Max 25 MB)
                </span>
                <input type="file" accept="image/*,video/mp4" onChange={handleFileUpload} className="hidden" />
              </label>
              {uploadProgress && <p className="text-xs text-gold-dark">{uploadProgress}</p>}
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {uploadedPhotos.map((p) => (
                    <div key={p.id} className="relative rounded-xl border border-sand p-1 bg-white">
                      <img
                        src={`${API_BASE.replace('/api/v1', '')}${p.signedUrl}`}
                        alt={p.originalName}
                        className="h-24 w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveUpload(p.id)}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-600 shadow"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 4: Itinerary */}
            <div className="lbdc-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-ink">4. Event Itinerary</h2>
                <button
                  type="button"
                  onClick={() => setItinerary([...itinerary, { title: '', time: '', venue: '' }])}
                  className="lbdc-btn-outline inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Event
                </button>
              </div>
              {itinerary.map((item, idx) => (
                <div key={idx} className="grid gap-3 sm:grid-cols-3">
                  <input
                    placeholder="Event (e.g., Sangeet)"
                    value={item.title}
                    onChange={(e) => {
                      const next = [...itinerary];
                      next[idx].title = e.target.value;
                      setItinerary(next);
                    }}
                    className="rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Time (e.g., 7:00 PM)"
                    value={item.time}
                    onChange={(e) => {
                      const next = [...itinerary];
                      next[idx].time = e.target.value;
                      setItinerary(next);
                    }}
                    className="rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Venue Hall"
                    value={item.venue}
                    onChange={(e) => {
                      const next = [...itinerary];
                      next[idx].venue = e.target.value;
                      setItinerary(next);
                    }}
                    className="rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar: Customer Contact & Order Summary */}
          <div className="space-y-6">
            <div className="lbdc-card p-6 space-y-4 sticky top-24">
              <h2 className="font-serif text-xl font-bold text-ink">Order & 50% Advance Summary</h2>
              <div>
                <label className="text-xs font-semibold text-muted">Your Name *</label>
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Email *</label>
                <input
                  required
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">WhatsApp / Phone (E.164) *</label>
                <input
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="mt-1 w-full rounded-xl border border-sand bg-ivory px-3 py-2 text-sm"
                />
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-muted">Coupon Code</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="LBDC10"
                    className="flex-1 rounded-xl border border-sand bg-ivory px-3 py-2 text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="lbdc-btn-outline rounded-xl px-4 py-2 text-xs font-semibold"
                  >
                    Apply
                  </button>
                </div>
                {couponMsg && <p className="mt-1 text-xs text-gold-dark">{couponMsg}</p>}
              </div>

              <div className="space-y-2 border-t border-sand pt-4 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Package Price</span>
                  <span>₹{pricing.basePrice.toLocaleString('en-IN')}</span>
                </div>
                {pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-₹{pricing.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-ink border-t border-sand pt-2">
                  <span>Total Price</span>
                  <span>₹{pricing.totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-gold-dark font-semibold">
                  <span>50% Advance Due Now</span>
                  <span>₹{pricing.advanceAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>50% Balance (After Preview Approval)</span>
                  <span>₹{pricing.balanceAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="lbdc-btn-gold w-full rounded-full py-3.5 text-sm font-semibold shadow-sm disabled:opacity-60"
              >
                {submitting ? 'Creating Order...' : 'Submit Order & Proceed to Payment'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Loading Moments Studio...</div>}>
      <StudioContent />
    </Suspense>
  );
}
