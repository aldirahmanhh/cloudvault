import './globals.css';
import ToastProvider from './components/ToastProvider';

export const metadata = {
  title: 'CloudVault - Discord & Telegram Storage',
  description: 'Free cloud storage powered by Discord and Telegram',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
