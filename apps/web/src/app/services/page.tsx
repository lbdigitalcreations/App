'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/catalog/services')
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
          Our Craft
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-ink">
          Celebration Categories
        </h1>
        <p className="mt-3 text-base text-muted">
          Every milestone deserves a living digital keepsake. Explore our 11 curated celebration
          categories—each customizable in Moments Studio.
        </p>
      </div>

      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="lbdc-card h-64 animate-pulse bg-white p-6" />
          ))}
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <div key={svc.id} className="lbdc-card flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-sand bg-ivory px-3 py-1 text-xs font-semibold text-gold-dark">
                    Starting ₹{Number(svc.basePrice).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-muted">
                    {svc._count?.templates ?? 0} templates
                  </span>
                </div>
                <h2 className="mt-4 font-serif text-2xl font-bold text-ink">{svc.title}</h2>
                {svc.subtitle && (
                  <p className="mt-1 text-xs font-medium text-gold-dark">{svc.subtitle}</p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-muted">{svc.description}</p>
                <ul className="mt-4 space-y-1.5 text-xs text-ink">
                  {(svc.includedFeatures || []).slice(0, 4).map((f: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-gold-dark" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 flex gap-2">
                <Link
                  href={`/templates?category=${svc.slug}`}
                  className="lbdc-btn-outline flex-1 rounded-full py-2.5 text-center text-xs font-semibold"
                >
                  View Templates
                </Link>
                <Link
                  href={`/studio?serviceId=${svc.id}`}
                  className="lbdc-btn-gold inline-flex flex-1 items-center justify-center gap-1 rounded-full py-2.5 text-xs font-semibold"
                >
                  Customize <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
