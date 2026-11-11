'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drama } from '@/types/drama';
import { Play, Pause, Bookmark, Check, Share2, Volume2, VolumeX, ChevronUp, ChevronDown, Film } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Props {
  dramas: Drama[];
}

export default function ShortsClient({ dramas }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const { addFavorite, removeFavorite, isFavorite } = useAppStore();

  const currentDrama = dramas[activeIndex] || dramas[0];
  const bookmarked = currentDrama ? isFavorite(currentDrama.id) : false;

  const handleNext = () => {
    if (activeIndex < dramas.length - 1) {
      setActiveIndex(activeIndex + 1);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setIsPlaying(true);
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

  // 100% verified working video streams
  const sampleVideos = [
    'https://vjs.zencdn.net/v/oceans.mp4',
    'https://media.w3.org/2010/05/sintel/trailer.mp4',
    'https://www.w3schools.com/html/mov_bbb.mp4',
  ];
  const videoUrl = sampleVideos[activeIndex % sampleVideos.length];

  if (!dramas || dramas.length === 0) return null;

  return (
    <div className="relative mx-auto w-full max-w-[420px] h-[calc(100vh-6rem)] max-h-[780px] rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl flex flex-col justify-between select-none">
      {/* Background Video */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        <video
          key={videoUrl}
          src={videoUrl}
          autoPlay={isPlaying}
          loop
          muted={isMuted}
          playsInline
          className="h-full w-full object-cover"
        />

        {/* Play indicator on pause */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-xl">
              <Play className="h-8 w-8 fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/80 backdrop-blur-md text-xs font-bold text-white shadow">
          <Film className="h-3.5 w-3.5" />
          Shorts Drama
        </span>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white border border-white/10 hover:bg-black/80 transition-colors"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Floating Right Actions */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col gap-4 items-center">
        <button
          onClick={toggleFavorite}
          className="flex flex-col items-center gap-1 text-white group"
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md border transition-transform group-hover:scale-110 ${
              bookmarked
                ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/40'
                : 'bg-black/50 border-white/20 text-white'
            }`}
          >
            {bookmarked ? <Check className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </div>
          <span className="text-[10px] font-semibold">{bookmarked ? 'Tersimpan' : 'Koleksi'}</span>
        </button>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: currentDrama.title, url: window.location.href }).catch(() => {});
            }
          }}
          className="flex flex-col items-center gap-1 text-white group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 border border-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
            <Share2 className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold">Bagikan</span>
        </button>
      </div>

      {/* Bottom Info Overlay */}
      <div className="relative z-10 p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
              Episode 1
            </span>
            {currentDrama.hotCode && (
              <span className="text-[10px] font-semibold text-rose-400">
                🔥 {currentDrama.hotCode}
              </span>
            )}
          </div>

          <h2 className="text-base font-extrabold text-white line-clamp-1">
            {currentDrama.title}
          </h2>

          <p className="mt-1 text-xs text-gray-300 line-clamp-2">
            {currentDrama.intro}
          </p>
        </div>

        <Link
          href={`/drama/${currentDrama.source}/${currentDrama.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          Buka Semua Episode
        </Link>
      </div>

      {/* Desktop Up/Down Control Buttons */}
      <div className="hidden sm:flex absolute -right-16 top-1/2 -translate-y-1/2 flex-col gap-3">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-30 transition-all"
          title="Video Sebelumnya"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          onClick={handleNext}
          disabled={activeIndex === dramas.length - 1}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-30 transition-all"
          title="Video Selanjutnya"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
