import { fetchLatestDramas } from '@/lib/api';
import LatestPageClient from './LatestPageClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Film & Drama Terbaru - Ngab Dracin',
  description: 'Daftar drama China terbaru yang baru dirilis hari ini secara live.',
};

export default async function TerbaruPage() {
  const latestDramas = await fetchLatestDramas(80);

  return <LatestPageClient initialDramas={latestDramas} />;
}
