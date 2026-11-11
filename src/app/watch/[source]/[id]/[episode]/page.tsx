import { fetchDramaDetail, fetchDramaStream } from '@/lib/api';
import { DramaSource } from '@/types/drama';
import { notFound } from 'next/navigation';
import WatchScreenClient from './WatchScreenClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{
    source: string;
    id: string;
    episode: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { source, id, episode } = await params;
  const drama = await fetchDramaDetail(source as DramaSource, id);
  const ep = parseInt(episode, 10) || 1;

  if (!drama) return { title: 'Tonton Video - Ngab Dracin' };

  return {
    title: `Nonton ${drama.title} Episode ${ep} - Ngab Dracin`,
    description: `Streaming ${drama.title} Episode ${ep} subtitle dan dubbing Indonesia tanpa iklan mengganggu.`,
  };
}

export default async function WatchPage({ params }: Props) {
  const { source, id, episode } = await params;
  const epNumber = parseInt(episode, 10) || 1;

  const [drama, streamData] = await Promise.all([
    fetchDramaDetail(source as DramaSource, id),
    fetchDramaStream(source as DramaSource, id, epNumber),
  ]);

  if (!drama) {
    notFound();
  }

  return (
    <WatchScreenClient
      drama={drama}
      currentEpisodeNumber={epNumber}
      streamData={streamData}
    />
  );
}
