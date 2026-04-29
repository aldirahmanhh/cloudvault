'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect mobile
    const mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem('install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      return; // Don't show for 24h after dismiss
    }

    // Listen for beforeinstallprompt (Chrome/Edge/Samsung)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (mobile) setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS Safari — show manual instructions
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && mobile && !window.navigator.standalone) {
      setTimeout(() => setShow(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('install-dismissed', Date.now().toString());
  };

  if (!show || !isMobile || isInstalled) return null;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <div className="install-banner-icon">
          <Smartphone size={20} />
        </div>
        <div className="install-banner-text">
          <strong>Install CloudVault</strong>
          <p>
            {isIOS
              ? 'Tap Share → "Add to Home Screen"'
              : 'Install as app for quick file sharing'}
          </p>
        </div>
        <div className="install-banner-actions">
          {!isIOS && deferredPrompt && (
            <button className="btn btn-primary install-btn" onClick={handleInstall}>
              <Download size={14} /> Install
            </button>
          )}
          <button className="btn btn-icon install-dismiss" onClick={handleDismiss}>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
