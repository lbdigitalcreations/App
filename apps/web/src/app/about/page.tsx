import Link from 'next/link';
import { LBDC_BRAND } from '@lbdc/shared';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 space-y-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">About Us</p>
      <h1 className="font-serif text-4xl font-bold text-ink">{LBDC_BRAND.name}</h1>
      <p className="text-base leading-relaxed text-muted">
        {LBDC_BRAND.tagline}. We transform traditional invitations and event memories into living,
        luxury digital celebration websites—crafted with editorial typography, interactive timelines,
        photo galleries, Google Maps venue pins, and instant guest RSVPs.
      </p>
      <div className="lbdc-card p-6 grid gap-4 sm:grid-cols-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-ink">50% Advance</h2>
          <p className="mt-1 text-xs text-muted">Start your project with 50% advance and pay the rest only after approving your preview.</p>
        </div>
        <div>
          <h2 className="font-serif text-lg font-bold text-ink">Unlimited Revisions</h2>
          <p className="mt-1 text-xs text-muted">We refine every detail until your celebration portal feels truly yours.</p>
        </div>
        <div>
          <h2 className="font-serif text-lg font-bold text-ink">Zero-Login Sharing</h2>
          <p className="mt-1 text-xs text-muted">Share one clean link or QR code—guests view instantly without creating accounts.</p>
        </div>
      </div>
      <Link href="/studio" className="lbdc-btn-gold inline-block rounded-full px-7 py-3 text-sm font-semibold">
        Start Creating in Moments Studio
      </Link>
    </div>
  );
}
