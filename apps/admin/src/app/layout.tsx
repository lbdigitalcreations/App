import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LBDC Admin Portal — LB Digital Creations',
  description: 'Protected Administration Dashboard for LB Digital Creations',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ivory text-ink">{children}</body>
    </html>
  );
}
