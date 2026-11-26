'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Heart, Search, SlidersHorizontal, X } from 'lucide-react';
import { apiFetch, getAccessToken } from '@/lib/api';

function TemplatesContent() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState('featured');
  const [compareList, setCompareList] = useState<any[]>([]);
  const [previewTpl, setPreviewTpl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/catalog/services').then(setServices).catch(() => {});
    if (getAccessToken()) {
      apiFetch('/catalog/favorites', { auth: true })
        .then((list) => setFavorites(new Set(list.map((f: any) => f.templateId))))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (search) qs.set('search', search);
    if (sort) qs.set('sort', sort);
    apiFetch(`/catalog/templates?${qs.toString()}`)
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, search, sort]);

  const toggleFavorite = async (templateId: string) => {
    if (!getAccessToken()) {
      window.location.href = '/login';
      return;
    }
    const res = await apiFetch(`/catalog/favorites/${templateId}`, { method: 'POST', auth: true });
    setFavorites((prev) => {
      const next = new Set(prev);
      if (res.favorited) next.add(templateId);
      else next.delete(templateId);
      return next;
    });
  };

  const toggleCompare = (tpl: any) => {
    setCompareList((prev) =>
      prev.some((t) => t.id === tpl.id)
        ? prev.filter((t) => t.id !== tpl.id)
        : prev.length < 3
          ? [...prev, tpl]
          : prev,
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Design Gallery
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold text-ink">Template Library</h1>
        </div>
        {compareList.length > 0 && (
          <div className="rounded-full border border-gold bg-white px-4 py-2 text-xs font-semibold text-ink">
            Comparing {compareList.length}/3 templates
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mt-8 grid gap-4 rounded-2xl border border-sand bg-white p-4 sm:grid-cols-3">
        <div className="flex items-center rounded-xl border border-sand bg-ivory px-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-sand bg-ivory px-3 py-2.5 text-sm outline-none"
        >
          <option value="">All Celebration Categories</option>
          {services.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 rounded-xl border border-sand bg-ivory px-3">
          <SlidersHorizontal className="h-4 w-4 text-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          >
            <option value="featured">Featured Order</option>
            <option value="name">Name (A–Z)</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="lbdc-card h-80 animate-pulse bg-white" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="lbdc-card mt-8 p-12 text-center">
          <p className="font-serif text-xl text-ink">No templates match your filter.</p>
          <button
            onClick={() => {
              setCategory('');
              setSearch('');
            }}
            className="lbdc-btn-outline mt-4 rounded-full px-5 py-2 text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const isFav = favorites.has(tpl.id);
            const isCompared = compareList.some((t) => t.id === tpl.id);
            return (
              <div key={tpl.id} className="lbdc-card flex flex-col justify-between p-6">
                <div>
                  <div className="relative flex h-44 items-center justify-center rounded-xl border border-sand bg-ivory p-4 text-center">
                    <button
                      onClick={() => toggleFavorite(tpl.id)}
                      className="absolute right-3 top-3 rounded-full bg-white p-2 shadow-sm border border-sand"
                      aria-label="Toggle favorite"
                    >
                      <Heart
                        className={`h-4 w-4 ${isFav ? 'fill-gold text-gold' : 'text-muted'}`}
                      />
                    </button>
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-gold-dark">
                        {tpl.service?.title}
                      </span>
                      <h2 className="mt-1 font-serif text-2xl font-bold text-ink">{tpl.name}</h2>
                      <p className="mt-1 text-xs text-muted">{tpl.tagline}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted line-clamp-2">{tpl.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(tpl.features || []).slice(0, 4).map((f: any) => (
                      <span
                        key={f.id}
                        className="rounded-full border border-sand bg-ivory px-2.5 py-0.5 text-[11px] text-ink"
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    href={`/studio?serviceId=${tpl.serviceId}&templateId=${tpl.id}`}
                    className="lbdc-btn-gold flex-1 rounded-full py-2.5 text-center text-xs font-semibold"
                  >
                    Customize
                  </Link>
                  <button
                    onClick={() => setPreviewTpl(tpl)}
                    className="lbdc-btn-outline rounded-full px-3.5 py-2.5 text-xs font-medium"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => toggleCompare(tpl)}
                    className={`rounded-full border px-3 py-2.5 text-xs font-medium ${
                      isCompared ? 'border-gold bg-champagne/30 text-ink' : 'border-sand text-muted'
                    }`}
                  >
                    {isCompared ? 'Compared' : 'Compare'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Table */}
      {compareList.length >= 2 && (
        <div className="lbdc-card mt-12 overflow-x-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl font-bold text-ink">Template Feature Comparison</h3>
            <button onClick={() => setCompareList([])} className="text-xs text-muted hover:text-ink">
              Clear Comparison
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand">
                <th className="py-2 text-muted font-medium">Feature</th>
                {compareList.map((t) => (
                  <th key={t.id} className="py-2 font-serif text-ink">
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sand">
                <td className="py-2.5 text-muted">Category</td>
                {compareList.map((t) => (
                  <td key={t.id} className="py-2.5">{t.service?.title}</td>
                ))}
              </tr>
              <tr className="border-b border-sand">
                <td className="py-2.5 text-muted">Animation Preset</td>
                {compareList.map((t) => (
                  <td key={t.id} className="py-2.5">{t.animationPreset}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 text-muted">Included Features</td>
                {compareList.map((t) => (
                  <td key={t.id} className="py-2.5">
                    <ul className="space-y-1">
                      {(t.features || []).map((f: any) => (
                        <li key={f.id} className="flex items-center gap-1.5 text-xs">
                          <Check className="h-3.5 w-3.5 text-gold-dark" /> {f.label}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="lbdc-card max-w-lg w-full p-6 relative">
            <button
              onClick={() => setPreviewTpl(null)}
              className="absolute right-4 top-4 text-muted hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-xs uppercase tracking-widest text-gold-dark">
              {previewTpl.service?.title}
            </p>
            <h3 className="mt-1 font-serif text-2xl font-bold text-ink">{previewTpl.name}</h3>
            <p className="mt-2 text-sm text-muted">{previewTpl.description}</p>
            <div className="mt-4 rounded-xl border border-sand bg-ivory p-4">
              <p className="text-xs font-semibold text-ink mb-2">Included Capabilities</p>
              <ul className="space-y-1.5 text-xs text-ink">
                {(previewTpl.features || []).map((f: any) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-gold-dark" /> {f.label}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href={`/studio?serviceId=${previewTpl.serviceId}&templateId=${previewTpl.id}`}
              className="lbdc-btn-gold mt-6 block rounded-full py-3 text-center text-sm font-semibold"
            >
              Use This Template in Moments Studio
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Loading templates...</div>}>
      <TemplatesContent />
    </Suspense>
  );
}
