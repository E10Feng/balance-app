import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BalanceWell',
  description: 'Daily balance exercises to reduce fall risk',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
