'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drama } from '@/types/drama';
import { Play, Bookmark, Check, Flame, Volume2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface HeroBannerProps {
  dramas: Drama[];
}

export default function HeroBanner({ dramas }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const favorites = useAppStore((s) => s.favorites);
  const addFavorite = useAppStore((s) => s.addFavorite);
  const removeFavorite = useAppStore((s) => s.removeFavorite);

  if (!dramas || dramas.length === 0) return null;

  const current = dramas[activeIndex] || dramas[0];
  const bookmarked = favorites.some((f) => f.dramaId === current.id);

  const toggleFavorite = () => {
    if (bookmarked) {
      removeFavorite(current.id);
    } else {
      addFavorite({
        dramaId: current.id,
        source: current.source,
        title: current.title,
        cover: current.cover,
        tags: current.tags,
        addedAt: Date.now(),
      });
    }
  };

  const backdropImage =
    current.horizontalCover ||
    current.cover ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80';

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-gray-950 border border-white/5 shadow-xl">
      {/* Background Image */}
      <div className="relative h-[250px] sm:h-[330px] md:h-[380px] w-full overflow-hidden">
        <img
          src={backdropImage}
          alt={current.title}
          className="h-full w-full object-cover object-center brightness-[0.65]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090a0f]/95 via-[#090a0f]/45 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 md:p-10 max-w-2xl">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white">
            <Flame className="h-3 w-3 fill-white" />
            TRENDING SEKARANG
          </span>
          {current.isDubbed && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
              <Volume2 className="h-3 w-3 text-rose-400" />
              DUB INDO
            </span>
          )}
        </div>

        <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tight line-clamp-2">
          {current.title}
        </h1>

        <p className="mt-1.5 text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed">
          {current.intro || 'Drama serial pendek populer dengan cerita seru di setiap episodenya.'}
        </p>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2.5">
          <Link
            href={`/drama/${current.source}/${current.id}`}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-rose-600/30 transition-all"
          >
            <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white" />
            <span>Nonton</span>
          </Link>

          <button
            onClick={toggleFavorite}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border transition-all ${
              bookmarked
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
            }`}
          >
            {bookmarked ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            <span>{bookmarked ? 'Tersimpan' : 'Simpan'}</span>
          </button>
        </div>

        {/* Dots */}
        {dramas.length > 1 && (
          <div className="mt-3.5 flex items-center gap-1.5">
            {dramas.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === idx ? 'w-6 bg-rose-500' : 'w-1.5 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
