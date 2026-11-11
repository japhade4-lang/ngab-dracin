import { fetchTrending } from '@/lib/api';
import ShortsClient from './ShortsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shorts Drama China - Scroll Video Pendek Ngab Dracin',
  description: 'Tonton drama pendek China pilihan dengan format vertikal ala TikTok/Reels langsung di browser.',
};

export default async function ShortsPage() {
  const dramas = await fetchTrending('dramabox');

  return (
    <div className="mx-auto max-w-lg min-h-[calc(100vh-4rem)] flex flex-col justify-center px-2 py-4">
      <ShortsClient dramas={dramas} />
    </div>
  );
}
