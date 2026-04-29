'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{ zIndex: 9999, pointerEvents: 'none' }}
      toastOptions={{
        style: {
          background: '#1e1e2e',
          color: '#cdd6f4',
          border: '1px solid #313244',
          pointerEvents: 'auto',
        },
      }}
    />
  );
}
