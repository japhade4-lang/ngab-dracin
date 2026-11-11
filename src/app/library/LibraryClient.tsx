'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Bookmark, History, Play, Trash2, Clock, Film } from 'lucide-react';

export default function LibraryClient() {
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('history');
  const { favorites, history, removeFavorite, removeFromHistory, clearHistory } = useAppStore();

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0 m';
    const m = Math.floor(seconds / 60);
    return `${m} m`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Perpustakaan Saya
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Kelola daftar drama favorit dan riwayat episode yang telah Anda tonton
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 self-start">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-rose-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Riwayat Tonton ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'favorites'
                ? 'bg-rose-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>Koleksi ({favorites.length})</span>
          </button>
        </div>
      </div>

      {/* Tab: Riwayat Tontonan */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length > 0 ? (
            <>
              <div className="flex justify-end">
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus Semua Riwayat</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((item) => {
                  const progress = item.duration > 0 ? (item.currentTime / item.duration) * 100 : 0;

                  return (
                    <div
                      key={item.dramaId}
                      className="group relative flex overflow-hidden rounded-xl bg-white/5 border border-white/5 hover:border-rose-500/30 transition-all p-3 gap-3"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-[3/4] w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-900">
                        <img
                          src={item.cover}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                      </div>

                      {/* Info & Progress */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-rose-400 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs font-semibold text-rose-400 mt-0.5">
                            Episode {item.episodeNumber}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(item.currentTime)} dari {formatDuration(item.duration)}
                          </p>
                        </div>

                        {/* Progress Bar & Actions */}
                        <div className="space-y-2 pt-2">
                          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-rose-500 h-1 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Link
                              href={`/watch/${item.source}/${item.dramaId}/${item.episodeNumber}`}
                              className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                            >
                              <Play className="h-3 w-3 fill-rose-400" />
                              Lanjutkan
                            </Link>

                            <button
                              onClick={() => removeFromHistory(item.dramaId)}
                              className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                              title="Hapus dari riwayat"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20 space-y-3 bg-white/5 rounded-2xl border border-white/5">
              <History className="h-12 w-12 text-gray-600 mx-auto" />
              <p className="text-base font-semibold text-gray-300">
                Belum ada riwayat tontonan
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Drama dan episode yang Anda tonton akan otomatis tersimpan di sini agar Anda bisa melanjutkan kapan saja.
              </p>
              <Link
                href="/"
                className="inline-block mt-3 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all shadow-lg shadow-rose-600/30"
              >
                Jelajahi Drama Sekarang
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab: Koleksi Favorit */}
      {activeTab === 'favorites' && (
        <div>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {favorites.map((item) => (
                <div
                  key={item.dramaId}
                  className="group relative flex flex-col overflow-hidden rounded-xl bg-white/5 border border-white/5 hover:border-rose-500/40 transition-all"
                >
                  <Link href={`/drama/${item.source}/${item.dramaId}`} className="aspect-[3/4] relative bg-gray-900 overflow-hidden">
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between p-3">
                    <Link href={`/drama/${item.source}/${item.dramaId}`}>
                      <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-white group-hover:text-rose-400 transition-colors">
                        {item.title}
                      </h3>
                    </Link>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        {item.source}
                      </span>
                      <button
                        onClick={() => removeFavorite(item.dramaId)}
                        className="text-gray-400 hover:text-rose-400 transition-colors p-1"
                        title="Hapus dari koleksi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-3 bg-white/5 rounded-2xl border border-white/5">
              <Bookmark className="h-12 w-12 text-gray-600 mx-auto" />
              <p className="text-base font-semibold text-gray-300">
                Belum ada drama yang disimpan
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Tekan tombol &quot;Tambah ke Koleksi&quot; di halaman drama untuk menyimpannya ke daftar tontonan Anda.
              </p>
              <Link
                href="/"
                className="inline-block mt-3 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all shadow-lg shadow-rose-600/30"
              >
                Mulai Menemukan Drama
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
