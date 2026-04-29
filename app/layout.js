import './globals.css';
import ToastProvider from './components/ToastProvider';

export const metadata = {
  title: 'CloudVault - Discord & Telegram Storage',
  description: 'Free cloud storage powered by Discord and Telegram',
  manifest: '/manifest.json',
  themeColor: '#8b5cf6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CloudVault',
  },
};

export const viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
