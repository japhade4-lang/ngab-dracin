'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Drama, Episode } from '@/types/drama';
import { PublicAccessStatus } from '@/types/access';
import VideoPlayer from '@/components/VideoPlayer';
import PaywallGate, { formatRemainingTime } from '@/components/PaywallGate';
import { useAppStore } from '@/lib/store';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Check,
  ListVideo,
  Volume2,
  Download,
  Loader2,
  Lock,
  Crown,
} from 'lucide-react';

interface Props {
  drama: Drama;
  currentEpisodeNumber: number;
  streamData: Episode;
  isLocked: boolean;
  accessStatus: PublicAccessStatus;
}

export default function WatchScreenClient({
  drama,
  currentEpisodeNumber,
  streamData,
  isLocked,
  accessStatus,
}: Props) {
  const router = useRouter();
  const updateHistory = useAppStore((s) => s.updateHistory);
  const addFavorite = useAppStore((s) => s.addFavorite);
  const removeFavorite = useAppStore((s) => s.removeFavorite);
  const bookmarked = useAppStore((s) => s.favorites.some((f) => f.dramaId === drama.id));

  const totalEpisodes = drama.totalEpisodes || 60;
  const hasNext = currentEpisodeNumber < totalEpisodes;
  const hasPrev = currentEpisodeNumber > 1;

  // Read initial resume time ONCE per drama/episode so live timeupdate never triggers re-renders
  const initialResumeTime = useMemo(() => {
    const item = useAppStore.getState().getHistoryItem(drama.id);
    if (item && item.episodeNumber === currentEpisodeNumber && item.currentTime > 2) {
      if (!item.duration || item.currentTime < item.duration - 2) {
        return item.currentTime;
      }
    }
    return 0;
  }, [drama.id, currentEpisodeNumber]);

  const lastSavedAtRef = useRef<number>(0);

  const [currentVideoUrl, setCurrentVideoUrl] = useState(streamData.videoUrl || '');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setCurrentVideoUrl(streamData?.videoUrl || '');
  }, [streamData?.videoUrl, currentEpisodeNumber]);

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

  const handleDownload = () => {
    if (!currentVideoUrl || isLocked) return;
    setIsDownloading(true);
    try {
      const cleanTitle = drama.title.replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
      const filename = `${cleanTitle}_EP${currentEpisodeNumber}.mp4`;
      const downloadEndpoint = `/api/download?url=${encodeURIComponent(
        currentVideoUrl
      )}&title=${encodeURIComponent(drama.title)}&episode=${currentEpisodeNumber}`;

      const a = document.createElement('a');
      a.href = downloadEndpoint;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(currentVideoUrl, '_blank');
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      const now = Date.now();
      if (now - lastSavedAtRef.current < 3000) return;
      lastSavedAtRef.current = now;
      updateHistory({
        dramaId: drama.id,
        source: drama.source,
        title: drama.title,
        cover: drama.cover,
        episodeNumber: currentEpisodeNumber,
        currentTime,
        duration,
        updatedAt: now,
      });
    },
    [drama.id, drama.source, drama.title, drama.cover, currentEpisodeNumber, updateHistory]
  );

  const handleEnded = useCallback(() => {
    if (hasNext) {
      router.push(`/watch/${drama.source}/${drama.id}/${currentEpisodeNumber + 1}`);
    }
  }, [hasNext, router, drama.source, drama.id, currentEpisodeNumber]);

  const episodes = useMemo(
    () => Array.from({ length: totalEpisodes }, (_, i) => i + 1),
    [totalEpisodes]
  );

  return (
    <div className="mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Main Player Column */}
        <div className="flex-1 space-y-3 sm:space-y-4">
          {/* Top Breadcrumb + Access Status Pill */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-400 px-0.5 gap-2">
            <Link
              href={`/drama/${drama.source}/${drama.id}`}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Detail Drama</span>
            </Link>

            <div className="flex items-center gap-2">
              {accessStatus.hasAccess ? (
                <Link
                  href="/akses"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] sm:text-xs font-semibold text-emerald-400"
                >
                  <Crown className="h-3 w-3" />
                  <span>VIP ({formatRemainingTime(accessStatus.remainingMs)})</span>
                </Link>
              ) : (
                <Link
                  href="/akses"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] sm:text-xs font-semibold text-rose-300 hover:bg-rose-500/25"
                >
                  <Crown className="h-3 w-3" />
                  <span>Gratis Ep 1–{accessStatus.freeEpisodes} • Akses 5k/hari</span>
                </Link>
              )}
              <span className="text-gray-400 text-xs">
                Ep {currentEpisodeNumber}/{totalEpisodes}
              </span>
            </div>
          </div>

          {/* Locked Paywall OR Active Video Player */}
          {isLocked ? (
            <PaywallGate
              accessStatus={accessStatus}
              lockedEpisode={currentEpisodeNumber}
              dramaTitle={drama.title}
            />
          ) : (
            <VideoPlayer
              key={`${drama.source}-${drama.id}-${currentEpisodeNumber}`}
              url={currentVideoUrl}
              source={drama.source}
              title={drama.title}
              episodeNumber={currentEpisodeNumber}
              initialTime={initialResumeTime}
              qualities={streamData.qualities}
              subtitles={streamData.subtitles}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onActiveUrlChange={setCurrentVideoUrl}
            />
          )}

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-white/5 border border-white/5 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              {hasPrev ? (
                <Link
                  href={`/watch/${drama.source}/${drama.id}/${currentEpisodeNumber - 1}`}
                  className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-xs sm:text-sm font-semibold text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Sebelumnya</span>
                </Link>
              ) : (
                <span className="text-xs text-gray-500 px-2 py-2">Episode 1</span>
              )}

              {hasNext && (
                <Link
                  href={`/watch/${drama.source}/${drama.id}/${currentEpisodeNumber + 1}`}
                  className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-rose-600/30 transition-all"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isLocked && (
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                  ) : (
                    <Download className="h-4 w-4 text-rose-400" />
                  )}
                  <span className="hidden sm:inline">{isDownloading ? 'Menyiapkan...' : 'Unduh'}</span>
                </button>
              )}

              <button
                onClick={toggleFavorite}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold border transition-all ${
                  bookmarked
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                {bookmarked ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Tersimpan</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Drama Title & Info Card */}
          <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {drama.isDubbed && (
                <span className="flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Volume2 className="h-3 w-3" />
                  DUB INDO
                </span>
              )}
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase font-semibold text-gray-300">
                {drama.source}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-white">
              {drama.title} - Episode {currentEpisodeNumber}
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{drama.intro}</p>
          </div>
        </div>

        {/* Sidebar: Episode Selector */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/5 p-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListVideo className="h-4 w-4 text-rose-500" />
                Daftar Episode
              </h3>
              <span className="text-xs text-gray-400">{totalEpisodes} Eps</span>
            </div>

            <div className="max-h-[420px] sm:max-h-[500px] overflow-y-auto no-scrollbar grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-2 pr-1">
              {episodes.map((epNum) => {
                const isCurrent = epNum === currentEpisodeNumber;
                const lockedEp = epNum > accessStatus.freeEpisodes && !accessStatus.hasAccess;
                return (
                  <Link
                    key={epNum}
                    href={`/watch/${drama.source}/${drama.id}/${epNum}`}
                    className={`flex items-center justify-center gap-1 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-600/40'
                        : lockedEp
                        ? 'bg-white/[0.02] hover:bg-white/10 border-white/5 text-gray-500 hover:text-gray-300'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-200 hover:text-white'
                    }`}
                  >
                    <span>{epNum}</span>
                    {lockedEp && !isCurrent && <Lock className="h-2.5 w-2.5 text-rose-400/70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
