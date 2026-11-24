import { fetchTrending, fetchForYou } from '@/lib/api';
import DramaCard from '@/components/DramaCard';
import { Flame } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trending Sekarang - Ngab Dracin',
  description: 'Daftar drama China paling populer dan sedang viral saat ini dari DramaBox & ShortMax.',
};

export default async function TrendingPage() {
  const [trending, forYou] = await Promise.all([
    fetchTrending('dramabox'),
    fetchForYou('dramabox'),
  ]);

  const seen = new Set(trending.map((d) => `${d.source}_${d.id}`));
  const allDramas = [
    ...trending,
    ...forYou.filter((d) => !seen.has(`${d.source}_${d.id}`)),
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500 fill-rose-500" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Trending Sekarang
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {allDramas.length} drama paling banyak ditonton saat ini
          </p>
        </div>
      </div>

      {/* Responsive Grid (3 cols on phone, 6 cols on desktop) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {allDramas.map((drama) => (
          <DramaCard key={`${drama.source}_${drama.id}`} drama={drama} />
        ))}
      </div>
    </div>
  );
}
