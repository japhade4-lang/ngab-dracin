'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Drama } from '@/types/drama';
import { Play, Bookmark, Check, Share2, Volume2, VolumeX, ChevronUp, ChevronDown, Film, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Hls from 'hls.js';

interface Props {
  dramas: Drama[];
}

export default function ShortsClient({ dramas }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [loadingStream, setLoadingStream] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const favorites = useAppStore((s) => s.favorites);
  const addFavorite = useAppStore((s) => s.addFavorite);
  const removeFavorite = useAppStore((s) => s.removeFavorite);

  const currentDrama = dramas[activeIndex] || dramas[0];
  const bookmarked = currentDrama ? favorites.some((f) => f.dramaId === currentDrama.id) : false;

  // Fetch genuine Episode 1 stream URL from API whenever slide changes
  useEffect(() => {
    if (!currentDrama) return;
    let cancelled = false;
    setLoadingStream(true);
    setStreamUrl('');

    fetch(`/api/stream?source=${encodeURIComponent(currentDrama.source)}&id=${encodeURIComponent(currentDrama.id)}&ep=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const qualities: { quality: string; videoUrl: string }[] = data.qualities || [];
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const picked = isMobile
          ? qualities.find((q) => q.quality.includes('540') || q.quality.includes('480'))?.videoUrl
          : qualities.find((q) => q.quality.includes('720'))?.videoUrl;
        setStreamUrl(picked || data.videoUrl || '');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingStream(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentDrama]);

  // Attach genuine video stream (Direct CDN MP4 or CORS-proxied HLS)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = streamUrl.includes('.m3u8');
    const resolved = isHls
      ? `/api/proxy/video?url=${encodeURIComponent(streamUrl)}&source=${encodeURIComponent(currentDrama.source)}`
      : streamUrl;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, maxBufferLength: 20 });
      hls.loadSource(resolved);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
      hlsRef.current = hls;
    } else {
      video.src = resolved;
      video.load();
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute('src');
    };
  }, [streamUrl, currentDrama?.source]);

  const handleNext = () => {
    if (activeIndex < dramas.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleFavorite = () => {
    if (!currentDrama) return;
    if (bookmarked) {
      removeFavorite(currentDrama.id);
    } else {
      addFavorite({
        dramaId: currentDrama.id,
        source: currentDrama.source,
        title: currentDrama.title,
        cover: currentDrama.cover,
        tags: currentDrama.tags,
        addedAt: Date.now(),
      });
    }
  };

  if (!dramas || dramas.length === 0) return null;

  return (
    <div className="relative mx-auto w-full max-w-[420px] h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6rem)] max-h-[780px] rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl flex flex-col justify-between select-none">
      {/* Background Real Video */}
      <div className="absolute inset-0 cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          loop
          muted={isMuted}
          playsInline
          className="h-full w-full object-cover"
        />

        {loadingStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
          </div>
        )}

        {!isPlaying && !loadingStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-xl">
              <Play className="h-8 w-8 fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="relative z-10 p-3.5 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/85 text-xs font-bold text-white">
          <Film className="h-3.5 w-3.5" />
          Shorts
        </span>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white border border-white/10 hover:bg-black/80"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Right Actions */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col gap-3.5 items-center">
        <button onClick={toggleFavorite} className="flex flex-col items-center gap-1 text-white">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border ${
              bookmarked ? 'bg-rose-600 border-rose-500 text-white' : 'bg-black/50 border-white/20 text-white'
            }`}
          >
            {bookmarked ? <Check className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </div>
          <span className="text-[10px] font-semibold">{bookmarked ? 'Tersimpan' : 'Simpan'}</span>
        </button>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: currentDrama.title, url: window.location.href }).catch(() => {});
            }
          }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 border border-white/20">
            <Share2 className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-semibold">Bagikan</span>
        </button>

        {/* Mobile quick up/down controls */}
        <div className="flex sm:hidden flex-col gap-2 pt-2">
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 disabled:opacity-30"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={activeIndex === dramas.length - 1}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 disabled:opacity-30"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="relative z-10 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-2.5">
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
            Episode 1
          </span>
          <h2 className="mt-1 text-sm sm:text-base font-extrabold text-white line-clamp-1">
            {currentDrama.title}
          </h2>
          <p className="mt-0.5 text-xs text-gray-300 line-clamp-2">{currentDrama.intro}</p>
        </div>

        <Link
          href={`/drama/${currentDrama.source}/${currentDrama.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          Tonton Semua Episode
        </Link>
      </div>

      {/* Desktop Up/Down Controls */}
      <div className="hidden sm:flex absolute -right-14 top-1/2 -translate-y-1/2 flex-col gap-3">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-30"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={handleNext}
          disabled={activeIndex === dramas.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-30"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
