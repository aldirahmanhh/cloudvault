'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobile);
    if (!mobile) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const dismissed = localStorage.getItem('install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', handler);

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS && !window.navigator.standalone) setTimeout(() => setShow(true), 2000);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !isMobile) return null;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <div className="install-banner-icon"><Smartphone size={20} /></div>
        <div className="install-banner-text">
          <strong>Install CloudVault</strong>
          <p>{isIOS ? 'Tap Share → "Add to Home Screen"' : 'Add to home screen for quick sharing'}</p>
        </div>
        <div className="install-banner-actions">
          {!isIOS && deferredPrompt && (
            <button className="btn btn-primary install-btn" onClick={async () => {
              deferredPrompt.prompt();
              const { outcome } = await deferredPrompt.userChoice;
              if (outcome === 'accepted') setShow(false);
              setDeferredPrompt(null);
            }}><Download size={14} /> Install</button>
          )}
          <button className="btn btn-icon" onClick={() => { setShow(false); localStorage.setItem('install-dismissed', Date.now().toString()); }}><X size={16} /></button>
        </div>
      </div>
    </div>
  );
}
