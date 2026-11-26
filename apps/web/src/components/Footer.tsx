import Link from 'next/link';
import { LBDC_BRAND } from '@lbdc/shared';

export function Footer() {
  return (
    <footer className="border-t border-sand bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img
                src="/images/logo.jpg"
                alt="LB Digital Creations"
                className="h-10 w-10 rounded-full border border-gold object-cover"
              />
              <div>
                <p className="font-serif text-lg font-semibold text-ink">{LBDC_BRAND.name}</p>
                <p className="text-xs text-muted">{LBDC_BRAND.tagline}</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Crafting bespoke, shareable digital celebration websites for weddings, birthdays,
              anniversaries, engagements, and life’s most cherished milestones.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink">
              <a href={`mailto:${LBDC_BRAND.email}`} className="hover:text-gold-dark">
                {LBDC_BRAND.email}
              </a>
              <span>•</span>
              <a href={LBDC_BRAND.whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-gold-dark">
                {LBDC_BRAND.phone}
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-ink">
              Platform
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link href="/services" className="hover:text-gold-dark">Celebration Categories</Link></li>
              <li><Link href="/templates" className="hover:text-gold-dark">Template Library</Link></li>
              <li><Link href="/studio" className="hover:text-gold-dark">Moments Studio</Link></li>
              <li><Link href="/pricing" className="hover:text-gold-dark">Packages & Pricing</Link></li>
              <li><Link href="/faq" className="hover:text-gold-dark">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-ink">
              Legal & Connect
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link href="/legal/privacy" className="hover:text-gold-dark">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="hover:text-gold-dark">Terms of Service</Link></li>
              <li><Link href="/legal/refund" className="hover:text-gold-dark">Refund & Revision Policy</Link></li>
              <li><a href={LBDC_BRAND.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-gold-dark">Instagram</a></li>
              <li><a href={LBDC_BRAND.whatsappChannelUrl} target="_blank" rel="noreferrer" className="hover:text-gold-dark">WhatsApp Channel</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-sand pt-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} LB Digital Creations. All rights reserved.</p>
          <p>50% Advance • Unlimited Revisions Before Approval • Live Hosting</p>
        </div>
      </div>
    </footer>
  );
}
