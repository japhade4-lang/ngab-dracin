import { fetchTrending } from '@/lib/api';
import SearchClient from './SearchClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pencarian Drama China - Temukan Judul Favoritmu di Ngab Dracin',
  description: 'Cari judul drama China subtitle & dubbing Indonesia dengan mudah dan cepat.',
};

export default async function SearchPage() {
  const initialDramas = await fetchTrending('netshort');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <SearchClient initialDramas={initialDramas} />
    </div>
  );
}
