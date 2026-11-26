'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Heart,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { LBDC_BRAND } from '@lbdc/shared';
import { apiFetch } from '@/lib/api';

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    apiFetch('/catalog/homepage')
      .then(setData)
      .catch(() => {});
  }, []);

  const services = data?.services ?? [];
  const templates = data?.featuredTemplates ?? [];
  const packages = data?.packages ?? [];
  const reviews = data?.reviews ?? [];
  const homepage = data?.settings?.homepage ?? {};
  const faqs = homepage.faqs ?? [
    {
      q: 'How does the 50% advance payment model work?',
      a: 'Pay 50% advance to start your bespoke celebration website, review your interactive preview with unlimited revisions, and pay the remaining 50% balance to publish live.',
    },
    {
      q: 'Do guests need to log in to view my website?',
      a: 'No! Published celebration websites open instantly via your unique link or QR code.',
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/templates?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div>
      {/* Special Offer Ribbon */}
      {homepage.specialOfferBanner && (
        <div className="border-b border-champagne bg-white px-4 py-2 text-center text-xs font-medium text-ink">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-gold-dark" />
            {homepage.specialOfferBanner}
          </span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-16 sm:py-24 border-b border-sand">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-champagne bg-ivory px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-dark">
              <Crown className="h-3.5 w-3.5" />
              Bespoke Celebration Websites
            </div>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
              {homepage.heroTitle || 'Turn Your Moments Into'}{' '}
              <span className="text-gold-dark">Living Websites</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {homepage.heroSubtitle ||
                'Elevate weddings, birthdays, anniversaries, and landmark milestones beyond static paper cards—with live countdowns, 4K galleries, Google Maps, and 1-tap guest RSVP.'}
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-7 flex max-w-md items-center rounded-full border border-sand bg-ivory p-1.5 shadow-sm focus-within:border-gold">
              <Search className="ml-3 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wedding, birthday, engagement..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
              />
              <button type="submit" className="lbdc-btn-gold rounded-full px-5 py-2 text-xs font-semibold">
                Explore
              </button>
            </form>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/studio"
                className="lbdc-btn-gold inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold shadow-sm"
              >
                Open Moments Studio <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/templates"
                className="lbdc-btn-outline inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                Browse Templates
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-sand pt-6 max-w-lg">
              <div>
                <p className="font-serif text-2xl font-bold text-ink">11+</p>
                <p className="text-xs text-muted">Celebration Categories</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-ink">50%</p>
                <p className="text-xs text-muted">Advance to Start</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-ink">Unlimited</p>
                <p className="text-xs text-muted">Preview Revisions</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="lbdc-card overflow-hidden p-2 shadow-sm">
              <img
                src="/images/luxury-portal-mockup.jpg"
                alt="LBDC Luxury Celebration Portal Mockup"
                className="h-72 w-full rounded-xl object-cover"
              />
            </div>
            <div className="lbdc-card overflow-hidden p-2 shadow-sm sm:mt-8">
              <img
                src="/images/luxury-celebration-suite.jpg"
                alt="LBDC Bespoke Celebration Suite"
                className="h-72 w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Popular Celebration Categories */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
                Curated Occasions
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-ink">
                Celebration Categories
              </h2>
            </div>
            <Link href="/services" className="text-sm font-semibold text-gold-dark hover:underline">
              View all categories →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((svc: any) => (
              <Link
                key={svc.id}
                href={`/templates?category=${svc.slug}`}
                className="lbdc-card group p-6 transition-all hover:border-gold hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="rounded-full bg-ivory px-3 py-1 text-xs font-semibold text-gold-dark border border-sand">
                    From ₹{Number(svc.basePrice).toLocaleString('en-IN')}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-gold-dark transition-colors" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold text-ink">{svc.title}</h3>
                <p className="mt-1 text-xs font-medium text-gold-dark">{svc.subtitle}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-2">
                  {svc.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Templates */}
      <section className="border-y border-sand bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
                Signature Designs
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-ink">
                Featured Templates
              </h2>
            </div>
            <Link href="/templates" className="text-sm font-semibold text-gold-dark hover:underline">
              Explore template library →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((tpl: any) => (
              <div key={tpl.id} className="lbdc-card flex flex-col justify-between p-5">
                <div>
                  <div
                    className="flex h-36 items-center justify-center rounded-xl border border-sand bg-ivory p-4 text-center"
                    style={{ borderColor: tpl.defaultThemeColor || '#C5A15A' }}
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-gold-dark">
                        {tpl.service?.title}
                      </p>
                      <p className="mt-1 font-serif text-lg font-semibold text-ink">{tpl.name}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-medium text-gold-dark">{tpl.tagline}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-3">
                    {tpl.description}
                  </p>
                </div>
                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/studio?serviceId=${tpl.serviceId}&templateId=${tpl.id}`}
                    className="lbdc-btn-gold flex-1 rounded-full py-2 text-center text-xs font-semibold"
                  >
                    Customize
                  </Link>
                  <Link
                    href={`/templates?highlight=${tpl.slug}`}
                    className="lbdc-btn-outline rounded-full px-3 py-2 text-xs font-medium"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works & Why Choose LBDC */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
              Seamless Journey
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-ink">How LBDC Works</h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '01', title: 'Choose & Customize', desc: 'Pick your occasion, select a luxury template, and upload photos & itinerary in Moments Studio.' },
              { step: '02', title: 'Pay 50% Advance', desc: 'Confirm your order securely via Razorpay or verified UPI to begin craftsmanship.' },
              { step: '03', title: 'Preview & Unlimited Revisions', desc: 'Review your live interactive preview and request unlimited refinements until perfect.' },
              { step: '04', title: 'Publish & Share', desc: 'Settle the 50% balance to publish your custom website with QR code, RSVP & wishes.' },
            ].map((item) => (
              <div key={item.step} className="lbdc-card p-6">
                <span className="font-serif text-2xl font-bold text-gold">{item.step}</span>
                <h3 className="mt-3 font-serif text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Packages Preview */}
          {packages.length > 0 && (
            <div className="mt-20">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
                  Transparent Investment
                </p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-ink">Celebration Packages</h2>
              </div>
              <div className="mt-10 grid gap-6 lg:grid-cols-3">
                {packages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className={`lbdc-card flex flex-col justify-between p-7 ${
                      pkg.isPopular ? 'border-gold ring-1 ring-gold' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif text-xl font-bold text-ink">{pkg.name}</h3>
                        {pkg.isPopular && (
                          <span className="rounded-full bg-gold px-3 py-0.5 text-[11px] font-semibold text-white">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <p className="mt-4 font-serif text-3xl font-bold text-ink">
                        ₹{Number(pkg.price).toLocaleString('en-IN')}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        50% advance (₹{(Number(pkg.price) / 2).toLocaleString('en-IN')}) • {pkg.deliveryDays}-day delivery
                      </p>
                      <p className="mt-3 text-sm text-muted">{pkg.description}</p>
                      <ul className="mt-5 space-y-2.5 text-sm text-ink">
                        {(pkg.includedFeatures || []).map((feat: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link
                      href={`/studio?packageId=${pkg.id}`}
                      className="lbdc-btn-gold mt-7 block rounded-full py-3 text-center text-sm font-semibold"
                    >
                      Select {pkg.name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials & FAQs */}
      <section className="border-t border-sand bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-14 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
              Client Distinction
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-ink">Celebration Stories</h2>
            <div className="mt-6 space-y-4">
              {reviews.map((rev: any) => (
                <div key={rev.id} className="lbdc-card p-6 bg-ivory">
                  <div className="flex items-center gap-1 text-gold-dark">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="mt-3 font-serif text-lg font-semibold text-ink">{rev.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">“{rev.comment}”</p>
                  <p className="mt-3 text-xs font-semibold text-ink">— {rev.customerName}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
              Clarity & Trust
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-ink">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-4">
              {faqs.map((faq: any, i: number) => (
                <div key={i} className="lbdc-card p-5">
                  <h3 className="font-serif text-base font-semibold text-ink">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{faq.a}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-sand bg-ivory p-5">
              <ShieldCheck className="h-8 w-8 shrink-0 text-gold-dark" />
              <div className="text-sm">
                <p className="font-semibold text-ink">Need bespoke assistance?</p>
                <p className="text-muted">
                  Reach us at{' '}
                  <a href={`mailto:${LBDC_BRAND.email}`} className="text-gold-dark underline">
                    {LBDC_BRAND.email}
                  </a>{' '}
                  or WhatsApp {LBDC_BRAND.phone}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
