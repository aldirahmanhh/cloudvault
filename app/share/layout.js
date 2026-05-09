const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudvault.my.id';

export const metadata = {
  title: 'Quick Upload - CloudVault',
  description: 'Quickly upload and share files using CloudVault. Drag and drop files up to 2GB, powered by Discord and Telegram storage.',
  openGraph: {
    title: 'Quick Upload - CloudVault',
    description: 'Quickly upload and share files using CloudVault. Drag and drop files up to 2GB.',
    url: `${siteUrl}/share`,
    siteName: 'CloudVault',
    type: 'website',
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
    card: 'summary',
    title: 'Quick Upload - CloudVault',
    description: 'Quickly upload and share files using CloudVault.',
    images: ['/logo.png'],
  },
};

export default function ShareLayout({ children }) {
  return children;
}
