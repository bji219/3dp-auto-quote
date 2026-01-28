import type { Metadata } from 'next';
import { DM_Mono, Syne } from 'next/font/google';
import './globals.css';

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-syne',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IDW3D Print Quote | Intelligent Design Works',
  description:
    'Get instant quotes for your 3D printing projects - Professional quality, fast turnaround',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmMono.variable} ${syne.variable}`}>
      <body className="min-h-screen bg-[#E7E1D5] font-mono">{children}</body>
    </html>
  );
}
