import './globals.css';
import Script from 'next/script';
import ToastProvider from './components/ToastProvider';
import ServiceWorker from './components/ServiceWorker';
import { SITE_URL } from '@/lib/constants';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CloudVault - Free Cloud Storage Powered by Discord & Telegram',
    template: '%s | CloudVault',
  },
  description: 'Free unlimited cloud storage solution using Discord and Telegram as backend. Upload, manage, and share files up to 2GB with zero database dependency. Perfect for developers and power users.',
  keywords: [
    'cloud storage',
    'free storage',
    'discord storage',
    'telegram storage',
    'file sharing',
    'unlimited storage',
    'serverless storage',
    'vercel deployment',
    'next.js storage',
    'file manager',
    'web storage',
    'cloudvault',
  ],
  authors: [{ name: 'CloudVault Team' }],
  creator: 'CloudVault',
  publisher: 'CloudVault',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  themeColor: '#8b5cf6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CloudVault',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'CloudVault',
    title: 'CloudVault - Free Cloud Storage Powered by Discord & Telegram',
    description: 'Free unlimited cloud storage using Discord and Telegram. Upload files up to 2GB, manage with ease, zero database required.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'CloudVault Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CloudVault - Free Cloud Storage',
    description: 'Free unlimited cloud storage using Discord and Telegram. Upload files up to 2GB with zero database.',
    images: ['/logo.png'],
    creator: '@cloudvault',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export const viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CloudVault',
    description: 'Free unlimited cloud storage solution using Discord and Telegram as backend. Upload, manage, and share files with zero database dependency.',
    url: SITE_URL,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Upload files up to 2GB',
      'Discord and Telegram integration',
      'File preview and management',
      'Telegram bot commands',
      'Zero database dependency',
      'Serverless architecture',
      'Mobile responsive',
      'PWA support',
    ],
    screenshot: `${SITE_URL}/logo.png`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="canonical" href={SITE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ToastProvider />
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
