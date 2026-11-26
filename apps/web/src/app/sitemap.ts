import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.lbdigitalcreations.in';
  const routes = ['', '/services', '/templates', '/pricing', '/about', '/contact', '/faq', '/legal/privacy', '/legal/terms'];
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
