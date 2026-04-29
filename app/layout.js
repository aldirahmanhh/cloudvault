import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'CloudVault - Discord & Telegram Storage',
  description: 'Free cloud storage powered by Discord and Telegram',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1e1e2e', color: '#cdd6f4', border: '1px solid #313244' },
        }} />
        {children}
      </body>
    </html>
  );
}
