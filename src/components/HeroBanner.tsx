'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drama } from '@/types/drama';
import { Play, Bookmark, Check, Flame, Volume2, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface HeroBannerProps {
  dramas: Drama[];
}

export default function HeroBanner({ dramas }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { addFavorite, removeFavorite, isFavorite } = useAppStore();

  if (!dramas || dramas.length === 0) return null;

  const current = dramas[activeIndex] || dramas[0];
  const bookmarked = isFavorite(current.id);

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
    <div className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl bg-gray-950 border border-white/5 shadow-2xl">
      {/* Background Image with Dark Vignette */}
      <div className="relative h-[380px] sm:h-[440px] md:h-[480px] w-full overflow-hidden">
        <img
          src={backdropImage}
          alt={current.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          className="h-full w-full object-cover object-center filter brightness-[0.7]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090a0f] via-[#090a0f]/40 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-12 max-w-3xl">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-rose-600/30">
            <Sparkles className="h-3.5 w-3.5" />
            REKOMENDASI UTAMA
          </span>
          {current.isDubbed && (
            <span className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/20">
              <Volume2 className="h-3.5 w-3.5 text-rose-400" />
              DUBBING INDONESIA
            </span>
          )}
          {current.hotCode && (
            <span className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-semibold text-rose-300 border border-white/10">
              <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              {current.hotCode} Penonton
            </span>
          )}
        </div>

        {/* Drama Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md line-clamp-2">
          {current.title}
        </h1>

        {/* Tags */}
        {current.tags && current.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
            {current.tags.map((tag) => (
              <span key={tag} className="rounded bg-white/10 px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Synopsis */}
        <p className="mt-3 text-xs sm:text-sm text-gray-300 line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow">
          {current.intro || 'Drama China serial pendek populer dengan kisah seru dan penuh emosi di setiap episodenya.'}
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3 sm:gap-4">
          <Link
            href={`/drama/${current.source}/${current.id}`}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-rose-600/30 transition-all hover:scale-105"
          >
            <Play className="h-4 w-4 fill-white" />
            Nonton Sekarang
          </Link>

          <button
            onClick={toggleFavorite}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold border backdrop-blur-md transition-all ${
              bookmarked
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
            }`}
          >
            {bookmarked ? (
              <>
                <Check className="h-4 w-4" />
                Tersimpan
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" />
                Tambah Koleksi
              </>
            )}
          </button>
        </div>

        {/* Slider Indicators */}
        {dramas.length > 1 && (
          <div className="mt-6 flex items-center gap-2">
            {dramas.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === idx ? 'w-8 bg-rose-500' : 'w-2 bg-white/30 hover:bg-white/60'
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
