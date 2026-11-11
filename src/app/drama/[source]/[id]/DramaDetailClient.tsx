'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drama } from '@/types/drama';
import { Play, Bookmark, Check, Share2, Flame, Volume2, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Props {
  drama: Drama;
}

export default function DramaDetailClient({ drama }: Props) {
  const { addFavorite, removeFavorite, isFavorite, getHistoryItem } = useAppStore();
  const bookmarked = isFavorite(drama.id);
  const historyItem = getHistoryItem(drama.id);

  const [copied, setCopied] = useState(false);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);

  const totalEpisodes = drama.totalEpisodes || 60;
  const chunkSize = 30;
  const totalChunks = Math.ceil(totalEpisodes / chunkSize);

  const episodes = Array.from({ length: totalEpisodes }, (_, i) => i + 1);
  const currentChunkEpisodes = episodes.slice(
    selectedRangeIndex * chunkSize,
    (selectedRangeIndex + 1) * chunkSize
  );

  const resumeEpisode = historyItem?.episodeNumber || 1;

  const toggleFavorite = () => {
    if (bookmarked) {
      removeFavorite(drama.id);
    } else {
      addFavorite({
        dramaId: drama.id,
        source: drama.source,
        title: drama.title,
        cover: drama.cover,
        tags: drama.tags,
        addedAt: Date.now(),
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: drama.title,
          text: `Nonton drama ${drama.title} di Dracin Zek!`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const backdrop =
    drama.horizontalCover ||
    drama.cover ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80';

  return (
    <div className="relative min-h-screen">
      {/* Cinematic Ambient Backdrop */}
      <div className="absolute top-0 left-0 right-0 h-[460px] overflow-hidden select-none pointer-events-none">
        <img
          src={backdrop}
          alt={drama.title}
          className="h-full w-full object-cover filter blur-2xl opacity-25 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#090a0f]/80 to-[#090a0f]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Top Info Layout: Poster + Details */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Card */}
          <div className="w-48 sm:w-56 md:w-64 flex-shrink-0 mx-auto md:mx-0 overflow-hidden rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
            <div className="aspect-[3/4] relative">
              <img
                src={drama.cover}
                alt={drama.title}
                className="h-full w-full object-cover"
              />
              {drama.isDubbed && (
                <div className="absolute top-3 left-3 flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                  <Volume2 className="h-3 w-3" />
                  DUB INDO
                </div>
              )}
            </div>
          </div>

          {/* Metadata & Actions */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-rose-600/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
                {drama.source}
              </span>
              {drama.hotCode && (
                <span className="flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                  <Flame className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                  {drama.hotCode}
                </span>
              )}
              <span className="text-xs text-gray-400">
                Total {totalEpisodes} Episode
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {drama.title}
            </h1>

            {drama.tags && drama.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {drama.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-300 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <div className="rounded-xl bg-white/5 p-4 border border-white/5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Sinopsis Drama
              </h2>
              <p className="text-sm text-gray-200 leading-relaxed">
                {drama.intro || 'Drama serial pendek seru yang menceritakan intrik keluarga, percintaan, dan konflik kekuasaan yang penuh kejutan di setiap episodenya.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/watch/${drama.source}/${drama.id}/${resumeEpisode}`}
                className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-rose-600/30 transition-all hover:scale-105"
              >
                <Play className="h-4 w-4 fill-white" />
                {historyItem ? `Lanjut Nonton (EP ${resumeEpisode})` : 'Mulai Nonton Episode 1'}
              </Link>

              <button
                onClick={toggleFavorite}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold border transition-all ${
                  bookmarked
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                {bookmarked ? (
                  <>
                    <Check className="h-4 w-4" />
                    Tersimpan di Koleksi
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    Tambah ke Koleksi
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
              >
                <Share2 className="h-4 w-4" />
                <span>{copied ? 'Tautan Disalin!' : 'Bagikan'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Episode Selector Section */}
        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500" />
              Pilih Episode ({totalEpisodes})
            </h2>

            {/* Range Pagination Tabs (e.g. 1-30, 31-60) */}
            {totalChunks > 1 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalChunks }, (_, idx) => {
                  const start = idx * chunkSize + 1;
                  const end = Math.min((idx + 1) * chunkSize, totalEpisodes);
                  const isSelected = selectedRangeIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedRangeIndex(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {start}-{end}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Episode Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2.5 pt-2">
            {currentChunkEpisodes.map((epNum) => {
              const isWatched = historyItem && historyItem.episodeNumber >= epNum;
              const isCurrent = historyItem && historyItem.episodeNumber === epNum;

              return (
                <Link
                  key={epNum}
                  href={`/watch/${drama.source}/${drama.id}/${epNum}`}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-bold transition-all relative ${
                    isCurrent
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                      : isWatched
                      ? 'bg-white/10 border-rose-500/30 text-rose-300 hover:bg-white/15'
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <span>{epNum}</span>
                  {isCurrent && (
                    <span className="text-[9px] font-normal text-rose-200">Terakhir</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
