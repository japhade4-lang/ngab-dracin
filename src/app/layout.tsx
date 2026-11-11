import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'Ngab Dracin - Nonton Drama China Sub & Dubbing Indonesia',
  description:
    'Platform streaming resmi drama China (Ngab Dracin), micro-drama shorts, dan sulih suara bahasa Indonesia terlengkap dan gratis.',
  keywords: [
    'ngab dracin',
    'drama china',
    'nonton dracin',
    'dubbing indonesia',
    'shorts drama',
    'dramabox web',
    'netshort web',
    'sulih suara indonesia',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#090a0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090a0f] text-gray-100 pb-16 md:pb-0">
        <Navbar />
        <main className="flex-1">{children}</main>
        <MobileNav />
      </body>
    </html>
  );
}
