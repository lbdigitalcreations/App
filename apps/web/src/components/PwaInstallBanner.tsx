'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-gold bg-white px-4 py-3 shadow-lg">
      <img src="/images/logo.jpg" alt="LBDC" className="h-9 w-9 rounded-full border border-gold object-cover" />
      <div className="text-xs">
        <p className="font-semibold text-ink">Install LBDC App</p>
        <p className="text-muted">Quick access to Moments Studio & orders</p>
      </div>
      <button
        onClick={handleInstall}
        className="lbdc-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
      >
        <Download className="h-3.5 w-3.5" /> Install
      </button>
      <button onClick={() => setDismissed(true)} className="text-muted hover:text-ink" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
