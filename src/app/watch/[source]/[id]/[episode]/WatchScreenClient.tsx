'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Drama, Episode } from '@/types/drama';
import VideoPlayer from '@/components/VideoPlayer';
import { useAppStore } from '@/lib/store';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Check,
  ListVideo,
  Volume2,
  Download,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface Props {
  drama: Drama;
  currentEpisodeNumber: number;
  streamData: Episode;
}

export default function WatchScreenClient({
  drama,
  currentEpisodeNumber,
  streamData,
}: Props) {
  const router = useRouter();
  const { updateHistory, addFavorite, removeFavorite, isFavorite, getHistoryItem } = useAppStore();

  const totalEpisodes = drama.totalEpisodes || 60;
  const hasNext = currentEpisodeNumber < totalEpisodes;
  const hasPrev = currentEpisodeNumber > 1;

  const bookmarked = isFavorite(drama.id);
  const historyItem = getHistoryItem(drama.id);

  const [currentVideoUrl, setCurrentVideoUrl] = useState(streamData.videoUrl || '');
  const [isLicensed, setIsLicensed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');

  // Synchronize active video URL directly from genuine streamData
  useEffect(() => {
    if (streamData?.videoUrl) {
      setCurrentVideoUrl(streamData.videoUrl);
    }
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
    if (!currentVideoUrl) return;
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
    } catch (err) {
      window.open(currentVideoUrl, '_blank');
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    updateHistory({
      dramaId: drama.id,
      source: drama.source,
      title: drama.title,
      cover: drama.cover,
      episodeNumber: currentEpisodeNumber,
      currentTime,
      duration,
      updatedAt: Date.now(),
    });
  };

  const handleEnded = () => {
    if (hasNext) {
      router.push(`/watch/${drama.source}/${drama.id}/${currentEpisodeNumber + 1}`);
    }
  };

  const episodes = Array.from({ length: totalEpisodes }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Player Column */}
        <div className="flex-1 space-y-4">
          {/* Back Navigation & Breadcrumb */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-400">
            <Link
              href={`/drama/${drama.source}/${drama.id}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Kembali ke Detail Drama</span>
            </Link>

            <span className="text-gray-500">
              Episode {currentEpisodeNumber} dari {totalEpisodes}
            </span>
          </div>

          {/* Video Player */}
          <VideoPlayer
            url={currentVideoUrl}
            source={drama.source}
            title={drama.title}
            episodeNumber={currentEpisodeNumber}
            initialTime={historyItem?.episodeNumber === currentEpisodeNumber ? historyItem.currentTime : 0}
            qualities={streamData.qualities}
            subtitles={streamData.subtitles}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onActiveUrlChange={setCurrentVideoUrl}
          />

          {/* Dramabuzz API Integration Banner */}
          <div className="rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-900 via-gray-900/90 to-gray-900 border-white/10 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Dramabuzz API Ecosystem</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Lisensi Aktif: B6860...B5D2
                  </span>
                </p>
                <p className="text-[11px] text-gray-400">
                  Terhubung langsung ke CDN Resmi Akamai (DramaBox & ShortMax). Video asli HD 1080p & 720p dengan Sulih Suara Indonesia.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://api.dramabuzz.sbs/api/status?key=B6860FC6979E745EF0C85B5E3496B5D2"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors"
              >
                <span>Status 44 Platform</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Online Streaming Notice */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span><strong>Streaming Langsung di Web:</strong> Klik tombol Play di layar video untuk memutar langsung secara online tanpa perlu mendownload apa pun.</span>
          </div>

          {/* Navigation Controls: Prev / Next / Download / Favorite buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/5 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              {hasPrev ? (
                <Link
                  href={`/watch/${drama.source}/${drama.id}/${currentEpisodeNumber - 1}`}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-xs sm:text-sm font-semibold text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Episode Sebelumnya</span>
                </Link>
              ) : (
                <span className="text-xs text-gray-500 px-3 py-2">Episode Pertama</span>
              )}

              {hasNext && (
                <Link
                  href={`/watch/${drama.source}/${drama.id}/${currentEpisodeNumber + 1}`}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-rose-600/30 transition-all"
                >
                  <span>Episode Selanjutnya</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Unduh Episode Button */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all disabled:opacity-50"
                title="Unduh Episode MP4 via Dracin API / CDN"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                ) : (
                  <Download className="h-4 w-4 text-rose-400" />
                )}
                <span>{isDownloading ? 'Menyiapkan...' : 'Simpan Offline (Opsional)'}</span>
              </button>

              {/* Bookmark Button */}
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
          <div className="rounded-xl bg-white/5 border border-white/5 p-4 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {drama.isDubbed && (
                <span className="flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  <Volume2 className="h-3 w-3" />
                  DUB INDO
                </span>
              )}
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase font-semibold text-gray-300">
                {drama.source}
              </span>
              <span className="rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 px-2 py-0.5 text-[10px] font-semibold">
                720p HD MP4 / HLS
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {drama.title} - Episode {currentEpisodeNumber}
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              {drama.intro}
            </p>
          </div>
        </div>

        {/* Sidebar: Episode Selector Drawer */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/5 p-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListVideo className="h-4 w-4 text-rose-500" />
                Daftar Episode
              </h3>
              <span className="text-xs text-gray-400">Total {totalEpisodes}</span>
            </div>

            {/* Scrollable Episode List */}
            <div className="max-h-[500px] overflow-y-auto no-scrollbar grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 pr-1">
              {episodes.map((epNum) => {
                const isCurrent = epNum === currentEpisodeNumber;
                return (
                  <Link
                    key={epNum}
                    href={`/watch/${drama.source}/${drama.id}/${epNum}`}
                    className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-600/40'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-300 hover:text-white'
                    }`}
                  >
                    {epNum}
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
