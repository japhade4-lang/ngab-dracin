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
}

export default function HorizontalSection({
  title,
  subtitle,
  icon,
  viewAllHref,
  dramas,
}: HorizontalSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!dramas || dramas.length === 0) return null;

  return (
    <section className="relative my-8 sm:my-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors mr-2"
            >
              Lihat Semua →
            </Link>
          )}

          {/* Scroll Buttons for Desktop */}
          <button
            onClick={() => scroll('left')}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth"
      >
        {dramas.map((drama) => (
          <div
            key={drama.id}
            className="w-[145px] sm:w-[170px] md:w-[190px] flex-shrink-0 snap-start"
          >
            <DramaCard drama={drama} />
          </div>
        ))}
      </div>
    </section>
  );
}
