import { fetchDramaDetail, fetchDramaStream } from '@/lib/api';
import { isServerEpisodeAllowed } from '@/lib/accessAuth';
import { DramaSource } from '@/types/drama';
import { notFound } from 'next/navigation';
import WatchScreenClient from './WatchScreenClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

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
    description: `Streaming ${drama.title} Episode ${ep} subtitle dan dubbing Indonesia.`,
  };
}

export default async function WatchPage({ params }: Props) {
  const { source, id, episode } = await params;
  const epNumber = parseInt(episode, 10) || 1;

  const [{ allowed, status }, drama] = await Promise.all([
    isServerEpisodeAllowed(epNumber),
    fetchDramaDetail(source as DramaSource, id),
  ]);

  if (!drama) {
    notFound();
  }

  // Only fetch real stream URL when episode is free or user holds an active pass
  const streamData = allowed
    ? await fetchDramaStream(source as DramaSource, id, epNumber)
    : {
        episodeNumber: epNumber,
        title: `Episode ${epNumber}`,
        videoUrl: '',
        qualities: [],
        subtitles: [],
      };

  return (
    <WatchScreenClient
      drama={drama}
      currentEpisodeNumber={epNumber}
      streamData={streamData}
      isLocked={!allowed}
      accessStatus={status}
    />
  );
}
