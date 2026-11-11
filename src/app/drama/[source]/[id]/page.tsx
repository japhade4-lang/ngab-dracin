import { fetchDramaDetail } from '@/lib/api';
import { DramaSource } from '@/types/drama';
import { notFound } from 'next/navigation';
import DramaDetailClient from './DramaDetailClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{
    source: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { source, id } = await params;
  const drama = await fetchDramaDetail(source as DramaSource, id);
  if (!drama) return { title: 'Drama Tidak Ditemukan - Ngab Dracin' };

  return {
    title: `${drama.title} - Nonton Sub Indo di Ngab Dracin`,
    description: drama.intro || `Nonton serial ${drama.title} full episode subtitle dan dubbing Indonesia gratis.`,
    openGraph: {
      title: drama.title,
      description: drama.intro,
      images: [drama.cover],
    },
  };
}

export default async function DramaDetailPage({ params }: Props) {
  const { source, id } = await params;
  const drama = await fetchDramaDetail(source as DramaSource, id);

  if (!drama) {
    notFound();
  }

  return <DramaDetailClient drama={drama} />;
}
