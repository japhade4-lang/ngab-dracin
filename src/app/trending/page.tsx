import { fetchTrending, fetchForYou } from '@/lib/api';
import DramaCard from '@/components/DramaCard';
import { Flame, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trending Drama China Hari Ini - Ngab Dracin',
  description: 'Daftar drama China paling populer dan sedang viral dari penyedia DramaBox, NetShort, dan Melolo.',
};

export default async function TrendingPage() {
  const [trending, forYou] = await Promise.all([
    fetchTrending('dramabox'),
    fetchForYou('dramabox'),
  ]);

  const allDramas = [...trending, ...forYou.filter((d) => !trending.some((t) => t.id === d.id))];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-rose-500 fill-rose-500" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Trending & Paling Populer
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Menampilkan {allDramas.length} judul drama terhangat saat ini
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {allDramas.map((drama) => (
          <DramaCard key={drama.id} drama={drama} />
        ))}
      </div>
    </div>
  );
}
