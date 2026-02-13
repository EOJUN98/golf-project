import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'TUGOL',
  description: '골프장 예약의 새로운 기준',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased pb-16">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
