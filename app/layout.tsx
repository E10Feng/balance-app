import type { Metadata, Viewport } from 'next';
import './globals.css';
import Script from 'next/script';

export const viewport: Viewport = {
  themeColor: '#C4714A',
};

export const metadata: Metadata = {
  title: 'BalanceWell',
  description: 'Daily balance exercises to reduce fall risk',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BalanceWell',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
          }
        `}</Script>
      </body>
    </html>
  );
}
