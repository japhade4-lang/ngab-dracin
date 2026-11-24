'use client';

import { useState, useEffect } from 'react';
import { Drama } from '@/types/drama';
import DramaCard from '@/components/DramaCard';
import {
  Sparkles,
  RefreshCw,
  Search,
  Clock,
  Radio,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';

interface LatestPageClientProps {
  initialDramas: Drama[];
}

const REFRESH_INTERVAL_SECONDS = 60;

export default function LatestPageClient({ initialDramas }: LatestPageClientProps) {
  const [dramas, setDramas] = useState<Drama[]>(initialDramas || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Baru saja');
  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchFresh = async (isManual: boolean = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/latest?limit=100&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.dramas)) {
          const prevLen = dramas.length;
          setDramas(data.dramas);

          const timeStr = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastUpdated(timeStr);

          if (isManual) {
            setToastMessage('Katalog film terbaru berhasil disegarkan!');
            setTimeout(() => setToastMessage(null), 3000);
          } else if (data.dramas.length > prevLen) {
            setToastMessage(`Ditemukan ${data.dramas.length - prevLen} film baru!`);
            setTimeout(() => setToastMessage(null), 4000);
          }
        }
      }
    } catch (err) {
      console.warn('[LatestPage] Error refreshing:', err);
    } finally {
      setIsRefreshing(false);
      setCountdown(REFRESH_INTERVAL_SECONDS);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchFresh(false);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRefreshing]);

  // Filtering
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-lg shadow-rose-600/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Film & Drama Terbaru
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                  Live
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Rilis terbaru hari ini dari DramaBox & ShortMax dengan subtitle dan sulih suara Indonesia
              </p>
            </div>
          </div>
        </div>

        {/* Live Auto-Refresh Info & Manual Button */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-right">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Auto-Refresh: {countdown} detik
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-rose-400" /> Terakhir: {lastUpdated}
            </span>
          </div>

          <button
            onClick={() => fetchFresh(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Menyegarkan...' : 'Segarkan'}</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="h-4 w-4 text-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul drama terbaru..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>

        {/* Source Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `Semua (${dramas.length})` },
            { id: 'dramabox', label: `DramaBox (${dramas.filter((d) => d.source === 'dramabox').length})` },
            { id: 'shortmax', label: `ShortMax (${dramas.filter((d) => d.source === 'shortmax').length})` },
            { id: 'dubbed', label: `Dubbing ID (${dramas.filter((d) => d.isDubbed).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSource(tab.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSource === tab.id
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count Info */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>Menampilkan {filtered.length} film drama terbaru</span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-rose-400 hover:underline"
          >
            Hapus pencarian
          </button>
        )}
      </div>

      {/* Grid of Latest Dramas */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((drama) => (
            <div key={`${drama.source}_${drama.id}`} className="relative">
              <div className="absolute top-2 right-2 z-10 pointer-events-none">
                <span className="flex items-center gap-1 rounded bg-emerald-500/90 text-white text-[9px] font-black px-1.5 py-0.5 shadow-md shadow-emerald-500/40 uppercase tracking-wider backdrop-blur-sm">
                  Baru
                </span>
              </div>
              <DramaCard drama={drama} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white/5 rounded-2xl border border-white/5 space-y-3">
          <Sparkles className="h-10 w-10 text-gray-600" />
          <h3 className="text-base font-bold text-white">Tidak ada drama yang cocok</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Coba ubah kata kunci pencarian atau reset filter untuk melihat seluruh katalog terbaru.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSource('all');
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
          >
            Reset Filter
          </button>
        </div>
      )}
    </div>
  );
}
