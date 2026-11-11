import LibraryClient from './LibraryClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Koleksi & Riwayat Tontonan - Ngab Dracin',
  description: 'Kelola daftar drama favorit dan lanjutkan tontonan episode terakhirmu dengan mudah di Ngab Dracin.',
};

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <LibraryClient />
    </div>
  );
}
