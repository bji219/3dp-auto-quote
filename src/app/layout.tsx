import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '3D Print Quote System',
  description: 'Get instant quotes for your 3D printing projects',
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
