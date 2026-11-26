'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function PricingPage() {
  const [packages, setPackages] = useState<any[]>([]);
  useEffect(() => {
    apiFetch('/catalog/packages').then(setPackages).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
          50% Advance • 50% After Approval
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-ink">Celebration Packages</h1>
        <p className="mt-3 text-sm text-muted">
          Every package includes unlimited revisions before approval and live hosting.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`lbdc-card flex flex-col justify-between p-8 ${pkg.isPopular ? 'border-gold ring-1 ring-gold' : ''}`}
          >
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">{pkg.name}</h2>
              <p className="mt-4 font-serif text-4xl font-bold text-ink">
                ₹{Number(pkg.price).toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-xs text-muted">
                Advance: ₹{(Number(pkg.price) / 2).toLocaleString('en-IN')} • {pkg.deliveryDays} days
              </p>
              <p className="mt-3 text-sm text-muted">{pkg.description}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {(pkg.includedFeatures || []).map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href={`/studio?packageId=${pkg.id}`}
              className="lbdc-btn-gold mt-8 block rounded-full py-3 text-center text-sm font-semibold"
            >
              Choose {pkg.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
