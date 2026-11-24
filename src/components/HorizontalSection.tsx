'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Drama } from '@/types/drama';
import DramaCard from './DramaCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
  dramas: Drama[];
  isLive?: boolean;
}

export default function HorizontalSection({
  title,
  subtitle,
  icon,
  viewAllHref,
  dramas,
  isLive = false,
}: HorizontalSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -360 : 360;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!dramas || dramas.length === 0) return null;

  return (
    <section className="relative my-5 sm:my-7">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {title}
            </h2>
            {isLive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-400 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 whitespace-nowrap transition-colors mr-1"
            >
              Semua →
            </Link>
          )}

          <button
            onClick={() => scroll('left')}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel (mobile-adaptive poster sizing) */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-2.5 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
      >
        {dramas.map((drama) => (
          <div
            key={`${drama.source}_${drama.id}`}
            className="w-[122px] sm:w-[158px] md:w-[178px] flex-shrink-0 snap-start"
          >
            <DramaCard drama={drama} />
          </div>
        ))}
      </div>
    </section>
  );
}
