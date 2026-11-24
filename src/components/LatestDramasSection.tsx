'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Drama } from '@/types/drama';
import DramaCard from './DramaCard';
import {
  Sparkles,
  RefreshCw,
  Clock,
  Radio,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface LatestDramasSectionProps {
  initialDramas: Drama[];
}

const REFRESH_INTERVAL_SECONDS = 60;

export default function LatestDramasSection({ initialDramas }: LatestDramasSectionProps) {
  const [dramas, setDramas] = useState<Drama[]>(initialDramas || []);
  const [filter, setFilter] = useState<'all' | 'dramabox' | 'shortmax' | 'dubbed'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Baru saja');
  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [newBadgeText, setNewBadgeText] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Manual & automated refresh handler
  const refreshLatest = async (isManual: boolean = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/latest?limit=40&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.dramas) && data.dramas.length > 0) {
          const prevCount = dramas.length;
          setDramas(data.dramas);

          const now = new Date();
          const timeString = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastUpdated(timeString);

          if (isManual) {
            setNewBadgeText('Data Diperbarui!');
            setTimeout(() => setNewBadgeText(null), 3000);
          } else if (data.dramas.length > prevCount) {
            setNewBadgeText(`+${data.dramas.length - prevCount} Film Baru!`);
            setTimeout(() => setNewBadgeText(null), 4000);
          }
        }
      }
    } catch (err) {
      console.warn('[Latest] Refresh error:', err);
    } finally {
      setIsRefreshing(false);
      setCountdown(REFRESH_INTERVAL_SECONDS);
    }
  };

  // Timer for countdown and auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshLatest(false);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, isRefreshing]);

  // Scroll controls
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Filtered dramas
  const filteredDramas = dramas.filter((d) => {
    if (filter === 'dramabox') return d.source === 'dramabox';
    if (filter === 'shortmax') return d.source === 'shortmax';
    if (filter === 'dubbed') return d.isDubbed;
    return true;
  });

  const dramaboxCount = dramas.filter((d) => d.source === 'dramabox').length;
  const shortmaxCount = dramas.filter((d) => d.source === 'shortmax').length;
  const dubbedCount = dramas.filter((d) => d.isDubbed).length;

  return (
    <section className="relative my-8 sm:my-10 rounded-2xl bg-gradient-to-br from-rose-950/20 via-black/40 to-indigo-950/20 border border-rose-500/20 p-4 sm:p-6 backdrop-blur-md">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Title & Pulse Indicator */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shadow-md shadow-rose-600/40">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Film & Drama Terbaru
            </h2>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Auto-Update {autoRefresh ? `(${countdown}s)` : 'Nonaktif'}
            </span>
            {newBadgeText && (
              <span className="animate-bounce px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold shadow-lg shadow-rose-500/50">
                {newBadgeText}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
            <span>Rilis terkini dari DramaBox & ShortMax.</span>
            <span className="text-gray-500">•</span>
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="h-3 w-3 text-rose-400" />
              Diperbarui: {lastUpdated}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Manual Refresh Button */}
          <button
            onClick={() => refreshLatest(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
            title="Segarkan data film terbaru sekarang"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : 'text-gray-300'}`} />
            <span>{isRefreshing ? 'Memuat...' : 'Segarkan'}</span>
          </button>

          {/* View All Page Link */}
          <Link
            href="/terbaru"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30"
          >
            <Zap className="h-3.5 w-3.5 fill-white" />
            <span>Katalog Terbaru ({dramas.length})</span>
          </Link>

          {/* Desktop Left/Right Navigation */}
          <div className="hidden sm:flex items-center gap-1 ml-1">
            <button
              onClick={() => scroll('left')}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Countdown Progress Line */}
      {autoRefresh && (
        <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-rose-500 transition-all duration-1000 ease-linear"
            style={{
              width: `${(countdown / REFRESH_INTERVAL_SECONDS) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-2">
        <button
          onClick={() => setFilter('all')}
          className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          Semua Terbaru ({dramas.length})
        </button>
        <button
          onClick={() => setFilter('dramabox')}
          className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            filter === 'dramabox'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          DramaBox Baru ({dramaboxCount})
        </button>
        <button
          onClick={() => setFilter('shortmax')}
          className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            filter === 'shortmax'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          ShortMax Baru ({shortmaxCount})
        </button>
        <button
          onClick={() => setFilter('dubbed')}
          className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            filter === 'dubbed'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          Sulih Suara ID ({dubbedCount})
        </button>
      </div>

      {/* Horizontal Slider of Latest Dramas */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {filteredDramas.map((drama) => (
          <div
            key={`${drama.source}_${drama.id}`}
            className="flex-shrink-0 w-36 sm:w-44 md:w-48 relative"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Glowing New Badge */}
            <div className="absolute top-2 right-2 z-10 pointer-events-none">
              <span className="flex items-center gap-1 rounded bg-emerald-500/90 text-white text-[9px] font-black px-1.5 py-0.5 shadow-md shadow-emerald-500/40 uppercase tracking-wider backdrop-blur-sm">
                Baru
              </span>
            </div>
            <DramaCard drama={drama} />
          </div>
        ))}
      </div>
    </section>
  );
}
