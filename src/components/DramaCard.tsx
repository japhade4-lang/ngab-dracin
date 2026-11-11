'use client';

import Link from 'next/link';
import { Drama } from '@/types/drama';
import { Flame, Play, Volume2 } from 'lucide-react';

interface DramaCardProps {
  drama: Drama;
  className?: string;
}

export default function DramaCard({ drama, className = '' }: DramaCardProps) {
  const isDubbed = drama.isDubbed || drama.tags?.some((t) => t.toLowerCase().includes('dub') || t.toLowerCase().includes('sulih'));

  return (
    <Link
      href={`/drama/${drama.source}/${drama.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-white/5 border border-white/5 transition-all duration-300 hover:scale-[1.03] hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-600/10 ${className}`}
    >
      {/* Poster Aspect Ratio 3:4 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-900">
        <img
          src={drama.cover}
          alt={drama.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Play Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/50 transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="h-6 w-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {isDubbed && (
            <span className="flex items-center gap-1 rounded bg-rose-600/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
              <Volume2 className="h-3 w-3" />
              DUB INDO
            </span>
          )}
          {drama.source && (
            <span className="rounded bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-gray-300 border border-white/10">
              {drama.source}
            </span>
          )}
        </div>

        {/* Views / Hotness */}
        {drama.hotCode && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
            <Flame className="h-3 w-3 text-rose-400 fill-rose-400" />
            <span>{drama.hotCode}</span>
          </div>
        )}
      </div>

      {/* Drama Metadata */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-rose-400 transition-colors">
          {drama.title}
        </h3>

        {drama.tags && drama.tags.length > 0 && (
          <p className="mt-1 line-clamp-1 text-[11px] text-gray-400">
            {drama.tags.slice(0, 2).join(' • ')}
          </p>
        )}
      </div>
    </Link>
  );
}
