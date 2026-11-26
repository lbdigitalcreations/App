import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'LB Digital Creations — Creating Websites for Your Special Moments',
  description:
    'Bespoke, shareable celebration websites for weddings, birthdays, anniversaries, engagements, and milestone moments.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'LB Digital Creations — Creating Websites for Your Special Moments',
    description:
      'Turn your special moments into living celebration websites with countdowns, galleries, maps & RSVP.',
    type: 'website',
    url: 'https://www.lbdigitalcreations.in',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#C5A15A" />
      </head>
      <body className="min-h-screen flex flex-col bg-ivory text-ink">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <PwaInstallBanner />
      </body>
    </html>
  );
}
