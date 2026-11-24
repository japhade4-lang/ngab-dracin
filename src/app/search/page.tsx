import { fetchTrending } from '@/lib/api';
import SearchClient from './SearchClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pencarian Drama - Ngab Dracin',
  description: 'Cari judul drama China subtitle & dubbing Indonesia dengan mudah dan cepat.',
};

export default async function SearchPage() {
  const initialDramas = await fetchTrending('dramabox');

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
      <SearchClient initialDramas={initialDramas} />
    </div>
  );
}
