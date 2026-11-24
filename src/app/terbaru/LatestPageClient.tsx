'use client';

import { useState, useEffect } from 'react';
import { Drama } from '@/types/drama';
import DramaCard from '@/components/DramaCard';
import { Sparkles, RefreshCw, Search } from 'lucide-react';

interface LatestPageClientProps {
  initialDramas: Drama[];
}

const REFRESH_INTERVAL_SECONDS = 60;

export default function LatestPageClient({ initialDramas }: LatestPageClientProps) {
  const [dramas, setDramas] = useState<Drama[]>(initialDramas || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/latest?limit=80&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.dramas)) {
          setDramas(data.dramas);
        }
      }
    } catch {
      // ignore transient errors
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      fetchFresh();
    }, REFRESH_INTERVAL_SECONDS * 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = dramas.filter((d) => {
    const matchesSearch =
      !searchQuery ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.intro && d.intro.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSource =
      selectedSource === 'all'
        ? true
        : selectedSource === 'dubbed'
        ? d.isDubbed
        : d.source === selectedSource;

    return matchesSearch && matchesSource;
  });

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Film & Drama Terbaru
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {filtered.length} judul terbaru dari API DramaBox & ShortMax
          </p>
        </div>

        <button
          onClick={fetchFresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Memuat...' : 'Segarkan'}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul terbaru..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'dramabox', label: 'DramaBox' },
            { id: 'shortmax', label: 'ShortMax' },
            { id: 'dubbed', label: 'Dub Indo' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSource(tab.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSource === tab.id
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {filtered.map((drama) => (
            <DramaCard key={`${drama.source}_${drama.id}`} drama={drama} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 text-center bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <Sparkles className="h-8 w-8 text-gray-600" />
          <p className="text-sm font-semibold text-white">Tidak ada drama yang cocok</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSource('all');
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
