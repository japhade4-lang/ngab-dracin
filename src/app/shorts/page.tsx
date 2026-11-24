import { fetchTrending } from '@/lib/api';
import ShortsClient from './ShortsClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shorts Drama - Ngab Dracin',
  description: 'Tonton drama pendek China dalam format vertikal langsung di browser.',
};

export default async function ShortsPage() {
  const dramas = await fetchTrending('dramabox');

  return (
    <div className="mx-auto max-w-lg min-h-[calc(100dvh-4rem)] flex flex-col justify-center px-2 py-2 sm:py-4">
      <ShortsClient dramas={dramas} />
    </div>
  );
}
