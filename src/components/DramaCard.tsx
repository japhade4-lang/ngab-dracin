'use client';

import Link from 'next/link';
import { Drama } from '@/types/drama';
import { Play } from 'lucide-react';

interface DramaCardProps {
  drama: Drama;
  className?: string;
}

export default function DramaCard({ drama, className = '' }: DramaCardProps) {
  const isDubbed =
    drama.isDubbed ||
    drama.tags?.some((t) => t.toLowerCase().includes('dub') || t.toLowerCase().includes('sulih'));

  return (
    <Link
      href={`/drama/${drama.source}/${drama.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-white/[0.04] border border-white/5 transition-all duration-200 hover:border-rose-500/40 ${className}`}
    >
      {/* Poster Aspect Ratio 3:4 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-900">
        <img
          src={drama.cover}
          alt={drama.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

        {/* Play Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600/95 text-white shadow-lg">
            <Play className="h-5 w-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Single concise badge */}
        {isDubbed && (
          <span className="absolute top-1.5 left-1.5 rounded bg-rose-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white tracking-wide shadow">
            DUB
          </span>
        )}
      </div>

      {/* Minimal Metadata */}
      <div className="flex flex-1 flex-col p-2 sm:p-2.5">
        <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-white group-hover:text-rose-400 transition-colors leading-snug">
          {drama.title}
        </h3>

        <p className="mt-1 line-clamp-1 text-[10px] sm:text-[11px] text-gray-400">
          {drama.totalEpisodes ? `${drama.totalEpisodes} Eps` : drama.source?.toUpperCase()}
        </p>
      </div>
    </Link>
  );
}
