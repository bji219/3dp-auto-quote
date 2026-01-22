import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IDW3D Print Quote | Intelligent Design Works',
  description: 'Get instant quotes for your 3D printing projects - Professional quality, fast turnaround',
  icons: {
    icon: [
      { url: '/icon.jpeg', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/apple-icon.jpeg', type: 'image/jpeg' },
    ],
  },
  openGraph: {
    title: 'IDW3D Print Quote | Intelligent Design Works',
    description: 'Get instant quotes for your 3D printing projects - Professional quality, fast turnaround',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
