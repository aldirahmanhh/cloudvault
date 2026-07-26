'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{ zIndex: 9999, pointerEvents: 'none' }}
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#1a1a1a',
          border: '1px solid #1a1a1a',
          borderRadius: '8px',
          boxShadow: '4px 4px 0px #1a1a1a',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500,
          pointerEvents: 'auto',
        },
        success: {
          iconTheme: { primary: '#22c55e', secondary: '#ffffff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
        },
      }}
    />
  );
}
