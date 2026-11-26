import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/services', '/templates', '/pricing', '/about', '/contact', '/sites/'],
        disallow: ['/dashboard', '/orders', '/projects', '/studio', '/checkout'],
      },
    ],
    sitemap: 'https://www.lbdigitalcreations.in/sitemap.xml',
  };
}
