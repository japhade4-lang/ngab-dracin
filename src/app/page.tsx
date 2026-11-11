import { fetchTrending, fetchForYou, fetchDubbedDramas } from '@/lib/api';
import HeroBanner from '@/components/HeroBanner';
import HorizontalSection from '@/components/HorizontalSection';
import { Flame, Sparkles, Volume2, Film } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 1800; // ISR cache every 30 minutes

export default async function HomePage() {
  const [trendingDramas, forYouDramas, dubbedDramas] = await Promise.all([
    fetchTrending('dramabox'),
    fetchForYou('dramabox'),
    fetchDubbedDramas(),
  ]);

  const heroDramas = trendingDramas.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Featured Banner */}
      <HeroBanner dramas={heroDramas} />

      {/* Quick Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        {[
          { label: '🔥 Semua Trending', href: '/trending' },
          { label: '🎙️ Dubbing Indonesia', href: '/dubindo' },
          { label: '⚡ Shorts Drama', href: '/shorts' },
          { label: '👑 Drama VIP', href: '/trending?filter=vip' },
          { label: '💕 Romantis', href: '/search?q=romantis' },
          { label: '⚔️ Balas Dendam', href: '/search?q=balas+dendam' },
          { label: '🏢 CEO & Konglomerat', href: '/search?q=ceo' },
        ].map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="flex-shrink-0 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-all hover:border-rose-500/30"
          >
            {chip.label}
          </Link>
        ))}
      </div>

      {/* Sulih Suara Indonesia Section */}
      <HorizontalSection
        title="Sulih Suara Indonesia (DubIndo)"
        subtitle="Drama pilihan dengan pengisi suara bahasa Indonesia"
        icon={<Volume2 className="h-5 w-5 text-rose-500" />}
        viewAllHref="/dubindo"
        dramas={dubbedDramas}
      />

      {/* Trending Section */}
      <HorizontalSection
        title="Sedang Hangat & Trending"
        subtitle="Drama yang paling banyak ditonton minggu ini"
        icon={<Flame className="h-5 w-5 text-amber-500 fill-amber-500" />}
        viewAllHref="/trending"
        dramas={trendingDramas}
      />

      {/* For You Section */}
      <HorizontalSection
        title="Rekomendasi Untuk Anda"
        subtitle="Pilihan cerita terbaik dengan alur tak terduga"
        icon={<Sparkles className="h-5 w-5 text-rose-400" />}
        viewAllHref="/trending"
        dramas={forYouDramas}
      />

      {/* Short Dramas Spotlight */}
      <HorizontalSection
        title="Koleksi Episode Pendek"
        subtitle="Cerita padat dan menegangkan, tonton santai per episode"
        icon={<Film className="h-5 w-5 text-indigo-400" />}
        viewAllHref="/shorts"
        dramas={trendingDramas.slice().reverse()}
      />
    </div>
  );
}
