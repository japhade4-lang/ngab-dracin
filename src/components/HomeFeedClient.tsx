'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Drama } from '@/types/drama';
import HeroBanner from './HeroBanner';
import HorizontalSection from './HorizontalSection';
import { Flame, Sparkles, Volume2, Compass, RefreshCw } from 'lucide-react';

interface HomeFeedClientProps {
  initialTrending: Drama[];
  initialLatest: Drama[];
  initialDubbed: Drama[];
  initialForYou: Drama[];
}

export default function HomeFeedClient({
  initialTrending,
  initialLatest,
  initialDubbed,
  initialForYou,
}: HomeFeedClientProps) {
  const [trending, setTrending] = useState<Drama[]>(initialTrending);
  const [latest, setLatest] = useState<Drama[]>(initialLatest);
  const [dubbed, setDubbed] = useState<Drama[]>(initialDubbed);
  const [forYou, setForYou] = useState<Drama[]>(initialForYou);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshAllSections = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/home?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.trending) && data.trending.length > 0) setTrending(data.trending);
          if (Array.isArray(data.latest) && data.latest.length > 0) setLatest(data.latest);
          if (Array.isArray(data.dubbed) && data.dubbed.length > 0) setDubbed(data.dubbed);
          if (Array.isArray(data.forYou) && data.forYou.length > 0) setForYou(data.forYou);
        }
      }
    } catch {
      // ignore transient network errors
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh ALL columns from live API every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      refreshAllSections();
    }, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Compact Hero Spotlight */}
      <HeroBanner dramas={trending.slice(0, 5)} />

      {/* Minimal Quick Navigation + Live Sync Control */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          {[
            { label: '🔥 Trending', href: '/trending' },
            { label: '✨ Terbaru', href: '/terbaru' },
            { label: '🎙️ Dub Indo', href: '/dubindo' },
            { label: '⚡ Shorts', href: '/shorts' },
          ].map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-200 whitespace-nowrap transition-colors"
            >
              {chip.label}
            </Link>
          ))}
        </div>

        <button
          onClick={refreshAllSections}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-gray-300 whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
          title="Segarkan semua kolom"
        >
          <RefreshCw className={`h-3 w-3 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Menyegarkan...' : 'Segarkan'}</span>
        </button>
      </div>

      {/* 1. Live Trending Sekarang */}
      <HorizontalSection
        title="Trending Sekarang"
        icon={<Flame className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 fill-amber-500 shrink-0" />}
        viewAllHref="/trending"
        dramas={trending}
        isLive
      />

      {/* 2. Live Terbaru / Baru Rilis */}
      <HorizontalSection
        title="Film & Drama Terbaru"
        icon={<Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500 shrink-0" />}
        viewAllHref="/terbaru"
        dramas={latest}
        isLive
      />

      {/* 3. Live Sulih Suara Indonesia */}
      <HorizontalSection
        title="Dubbing Indonesia"
        icon={<Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400 shrink-0" />}
        viewAllHref="/dubindo"
        dramas={dubbed}
        isLive
      />

      {/* 4. Live Rekomendasi Untuk Anda */}
      <HorizontalSection
        title="Rekomendasi Untuk Anda"
        icon={<Compass className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 shrink-0" />}
        viewAllHref="/trending"
        dramas={forYou}
        isLive
      />
    </div>
  );
}
