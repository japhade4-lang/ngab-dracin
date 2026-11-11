'use client';

import { useState, useMemo, useEffect } from 'react';
import { Drama } from '@/types/drama';
import DramaCard from '@/components/DramaCard';
import { Search, X, Sparkles, History, Trash2, Loader2 } from 'lucide-react';

interface Props {
  initialDramas: Drama[];
}

export default function SearchClient({ initialDramas }: Props) {
  const [query, setQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<Drama[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dracin_search_history');
        return saved ? JSON.parse(saved) : ['cinta', 'ceo', 'balas dendam'];
      } catch {}
    }
    return ['cinta', 'ceo', 'balas dendam'];
  });

  const popularKeywords = [
    'Tolak Aku, Raja Naga',
    'Kesempatan Kedua',
    'Sewa Cinta',
    'Penjara Maut',
    'CEO Konglomerat',
    'Balas Dendam',
    'Sulih Suara ID',
  ];

  // Live online search across Dramabox and Shortmax
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setOnlineResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setOnlineResults(data.results);
        } else {
          setOnlineResults([]);
        }
      } catch (err) {
        console.warn('Search fetch error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredDramas = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    return initialDramas.filter(
      (d) =>
        d.title.toLowerCase().includes(trimmed) ||
        d.intro?.toLowerCase().includes(trimmed) ||
        d.tags?.some((t) => t.toLowerCase().includes(trimmed))
    );
  }, [query, initialDramas]);

  const displayDramas = onlineResults.length > 0 ? onlineResults : filteredDramas;

  const handleSelectKeyword = (kw: string) => {
    setQuery(kw);
    saveToHistory(kw);
  };

  const saveToHistory = (kw: string) => {
    if (!kw.trim()) return;
    const updated = [kw, ...history.filter((h) => h !== kw)].slice(0, 8);
    setHistory(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dracin_search_history', JSON.stringify(updated));
    }
  };

  const clearHistory = () => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dracin_search_history');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Search Bar Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveToHistory(query)}
            placeholder="Ketik judul drama, genre, atau kata kunci..."
            className="w-full rounded-2xl bg-white/5 border border-white/10 pl-12 pr-12 py-4 text-sm sm:text-base text-white placeholder-gray-400 focus:border-rose-500 focus:bg-white/10 focus:outline-none transition-all shadow-xl"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* When no query is typed: Show Popular keywords & Search History */}
      {!query.trim() ? (
        <div className="space-y-6">
          {/* Popular Keywords */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rose-500" />
              Kata Kunci Populer
            </h2>
            <div className="flex flex-wrap gap-2">
              {popularKeywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => handleSelectKeyword(kw)}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-all hover:border-rose-500/40"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Search History */}
          {history.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-400" />
                  Riwayat Pencarian
                </h2>
                <button
                  onClick={clearHistory}
                  className="text-xs text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Riwayat
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {history.map((kw) => (
                  <button
                    key={kw}
                    onClick={() => handleSelectKeyword(kw)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <span>{kw}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rekomendasi Tontonan */}
          <div className="pt-6">
            <h2 className="text-sm font-bold text-white mb-4">
              Mungkin Anda Suka
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {initialDramas.slice(0, 8).map((drama) => (
                <DramaCard key={drama.id} drama={drama} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* When search query is entered */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              {isSearching && <Loader2 className="h-4 w-4 animate-spin text-rose-500" />}
              <span>Hasil pencarian untuk &quot;<span className="text-white font-bold">{query}</span>&quot;</span>
            </h2>
            <span className="text-xs text-gray-400">{displayDramas.length} judul ditemukan</span>
          </div>

          {displayDramas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayDramas.map((drama) => (
                <DramaCard key={drama.id} drama={drama} />
              ))}
            </div>
          ) : isSearching ? (
            <div className="text-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500 mx-auto" />
              <p className="text-sm text-gray-400">Mencari di seluruh katalog drama...</p>
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <p className="text-base font-semibold text-gray-300">
                Tidak ada drama yang cocok dengan &quot;{query}&quot;
              </p>
              <p className="text-xs text-gray-500">
                Coba gunakan kata kunci lain seperti &quot;cinta&quot;, &quot;ceo&quot;, atau &quot;balas dendam&quot;.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
