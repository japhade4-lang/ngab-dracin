import { fetchLatestDramas } from '@/lib/api';
import LatestPageClient from './LatestPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Film & Drama China Terbaru Hari Ini - Ngab Dracin',
  description: 'Daftar episode dan film drama China terbaru yang baru dirilis hari ini dengan update otomatis live.',
};

export const revalidate = 60; // Revalidate every 60 seconds

export default async function TerbaruPage() {
  const latestDramas = await fetchLatestDramas(100);

  return <LatestPageClient initialDramas={latestDramas} />;
}
