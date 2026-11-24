import {
  fetchTrending,
  fetchForYou,
  fetchDubbedDramas,
  fetchLatestDramas,
} from '@/lib/api';
import HomeFeedClient from '@/components/HomeFeedClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [trendingDramas, latestDramas, dubbedDramas, forYouDramas] = await Promise.all([
    fetchTrending('dramabox'),
    fetchLatestDramas(24),
    fetchDubbedDramas(),
    fetchForYou('dramabox'),
  ]);

  return (
    <HomeFeedClient
      initialTrending={trendingDramas}
      initialLatest={latestDramas}
      initialDubbed={dubbedDramas}
      initialForYou={forYouDramas}
    />
  );
}
