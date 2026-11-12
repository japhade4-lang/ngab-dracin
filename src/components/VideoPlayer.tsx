'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  RotateCw,
  Settings,
  AlertCircle,
  RefreshCw,
  Loader2,
  Link as LinkIcon,
  Download,
  KeyRound,
  Check,
} from 'lucide-react';
import { SubtitleTrack, VideoQuality } from '@/types/drama';
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  source?: string;
  title?: string;
  episodeNumber?: number;
  initialTime?: number;
  qualities?: VideoQuality[];
  subtitles?: SubtitleTrack[];
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onActiveUrlChange?: (newUrl: string) => void;
}

export default function VideoPlayer({
  url,
  source = 'netshort',
  title = '',
  episodeNumber = 1,
  initialTime = 0,
  qualities = [],
  subtitles = [],
  onTimeUpdate,
  onEnded,
  onActiveUrlChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [customStreamInput, setCustomStreamInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeUrl, setActiveUrl] = useState(url);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Backup mirrors
  const backupMirrors = [
    'https://vjs.zencdn.net/v/oceans.mp4',
    'https://media.w3.org/2010/05/sintel/trailer.mp4',
    'https://www.w3schools.com/html/mov_bbb.mp4',
  ];

  // Load custom API key or saved custom stream if exists
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('dracin_api_key');
      if (savedKey) setApiKeyInput(savedKey);
    }
  }, []);

  const resolveStreamUrl = (target: string) => {
    if (!target) return backupMirrors[0];
    // Direct MP4 streams (e.g. DramaBox Akamai CDN hwztakavideoto.dramaboxdb.com)
    // MUST play directly from the edge CDN for instant buffering, hardware decoding, and zero stutter
    if (
      target.includes('dramabox') ||
      target.includes('dramaboxdb.com') ||
      target.includes('.mp4') ||
      target.includes('vjs.zencdn.net') ||
      target.includes('w3schools.com') ||
      target.includes('w3.org') ||
      target.includes('cdn.dracinapi.com') ||
      target.includes('mux.dev')
    ) {
      return target;
    }

    // Only proxy HLS streams that enforce strict cross-origin restrictions
    if (target.includes('.m3u8') && target.includes('shorttv.live')) {
      return `/api/proxy/video?url=${encodeURIComponent(target)}&source=${source}`;
    }

    return target;
  };

  useEffect(() => {
    setActiveUrl(url);
    setHasError(false);
    setIsLoading(true);
    if (onActiveUrlChange) {
      onActiveUrlChange(url);
    }
  }, [url, onActiveUrlChange]);

  const handlePlayerDownload = () => {
    const downloadEndpoint = `/api/download?url=${encodeURIComponent(
      activeUrl
    )}&title=${encodeURIComponent(title || 'Drama')}&episode=${episodeNumber}`;
    const a = document.createElement('a');
    a.href = downloadEndpoint;
    a.download = `${(title || 'Drama').replace(/\s+/g, '_')}_EP${episodeNumber}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const stream = resolveStreamUrl(activeUrl);
    setHasError(false);
    setIsLoading(true);
    const safetyTimer = setTimeout(() => setIsLoading(false), 2000);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (stream.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          maxBufferSize: 30 * 1000 * 1000,
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 20000,
        });
        hls.loadSource(stream);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (initialTime > 0) video.currentTime = initialTime;
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            handleVideoError();
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = stream;
      }
    } else {
      video.src = stream;
      video.load();
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch(() => {
            setIsPlaying(false);
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setIsLoading(false);
      setHasError(false);
      if (initialTime > 0) {
        video.currentTime = initialTime;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate && video.duration) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    const handleError = () => {
      handleVideoError();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);

      clearTimeout(safetyTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeUrl, initialTime]);

  const handleVideoError = () => {
    setIsLoading(false);
    const nextMirror = backupMirrors.find((m) => m !== activeUrl) || backupMirrors[0];
    if (activeUrl !== nextMirror) {
      setActiveUrl(nextMirror);
    } else {
      setHasError(true);
      setErrorMessage('Video tidak dapat diputar dari sumber saat ini.');
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true));
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipSeconds = (seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettings(false);
  };

  const applyCustomUrl = () => {
    if (customStreamInput.trim()) {
      const target = customStreamInput.trim();
      setActiveUrl(target);
      if (onActiveUrlChange) {
        onActiveUrlChange(target);
      }
      setShowApiModal(false);
    }
  };

  const saveApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dracin_api_key', apiKeyInput.trim());
      setApiKeySaved(true);
      setTimeout(() => {
        setApiKeySaved(false);
        window.location.reload();
      }, 800);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10 shadow-2xl group select-none flex items-center justify-center"
    >
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        onClick={togglePlay}
        className="h-full w-full object-contain cursor-pointer bg-black"
      />

      {/* Loading Spinner (only while actively playing or buffering) */}
      {isLoading && isPlaying && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none z-20">
          <Loader2 className="h-12 w-12 text-rose-500 animate-spin mb-2" />
          <p className="text-xs font-semibold text-gray-300">Memuat Video Episode {episodeNumber}...</p>
        </div>
      )}

      {/* Error Fallback Box */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 p-6 text-center space-y-3 z-30">
          <AlertCircle className="h-12 w-12 text-rose-500" />
          <h3 className="text-base font-bold text-white">Gagal Memutar Video</h3>
          <p className="text-xs text-gray-400 max-w-sm">{errorMessage}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setHasError(false);
                setActiveUrl(backupMirrors[0]);
              }}
              className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-all shadow"
            >
              <RefreshCw className="h-4 w-4" />
              Putar Server Cadangan
            </button>
            <button
              onClick={() => setShowApiModal(true)}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition-all border border-white/10"
            >
              <LinkIcon className="h-4 w-4" />
              Input URL / API Key
            </button>
          </div>
        </div>
      )}

      {/* Center Big Play Button if Paused */}
      {!isPlaying && !hasError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 cursor-pointer backdrop-blur-[2px] transition-all z-10"
        >
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-2xl shadow-rose-600/50 hover:scale-110 transition-transform">
            <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-white ml-1" />
          </div>
          <span className="mt-3 text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full border border-white/10">
            Klik untuk Memutar Video
          </span>
        </div>
      )}

      {/* Top Overlay Header */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-sm sm:text-base font-bold drop-shadow">{title}</h2>
            <p className="text-xs text-rose-400 font-semibold">Episode {episodeNumber}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Player Download Button */}
            <button
              onClick={handlePlayerDownload}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-gray-200 transition-colors"
              title="Unduh video yang sedang diputar (MP4)"
            >
              <Download className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden sm:inline">Unduh MP4</span>
            </button>

            {/* Quick API Key / Custom Stream Button */}
            <button
              onClick={() => setShowApiModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-gray-200 transition-colors"
              title="Pengaturan Dramabuzz API & URL Video"
            >
              <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Dramabuzz API / Ganti Sumber</span>
            </button>
          </div>
        </div>
      </div>

      {/* API Key & Custom URL Modal */}
      {showApiModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-400" />
                Sumber Video & Dramabuzz API
              </h3>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Custom Direct Stream URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Putar Langsung URL Video (MP4 / HLS .m3u8):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://.../video.mp4 atau master.m3u8"
                  value={customStreamInput}
                  onChange={(e) => setCustomStreamInput(e.target.value)}
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={applyCustomUrl}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all"
                >
                  Terapkan
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Mendukung tautan CDN langsung Akamai (DramaBox, ShortMax) atau server video lainnya.
              </p>
            </div>

            {/* Dramabuzz API License Key */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                <span>Dramabuzz License Key:</span>
                <span className="text-emerald-400 text-[10px] font-semibold">
                  ✓ Lisensi Sistem Aktif (44 Platform)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="B6860FC6979E745EF0C85B5E3496B5D2"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={saveApiKey}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all flex items-center gap-1"
                >
                  {apiKeySaved ? <Check className="h-3.5 w-3.5 text-white" /> : 'Simpan'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Lisensi aktif: <code className="text-emerald-400 font-mono">B6860FC6979E745EF0C85B5E3496B5D2</code>
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar Slider */}
        <div className="relative mb-3 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:h-2.5 transition-all"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:text-rose-400 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            </button>

            <button
              onClick={() => skipSeconds(-10)}
              className="p-1 hover:text-rose-400 transition-colors"
              title="Mundur 10 detik"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => skipSeconds(10)}
              className="p-1 hover:text-rose-400 transition-colors"
              title="Maju 10 detik"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="p-1 hover:text-rose-400 transition-colors">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>

            <span className="text-xs text-gray-300 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed / Settings Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span>{playbackSpeed}x</span>
                <Settings className="h-3.5 w-3.5" />
              </button>

              {showSettings && (
                <div className="absolute right-0 bottom-full mb-2 w-44 rounded-xl bg-gray-900/95 border border-white/10 p-2 shadow-2xl backdrop-blur-md space-y-2 z-50">
                  {/* Resolution / Quality Switcher */}
                  {qualities && qualities.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase">Kualitas Video</p>
                      <div className="space-y-0.5">
                        {qualities.map((q) => {
                          const isActive = activeUrl === q.videoUrl;
                          return (
                            <button
                              key={q.quality}
                              onClick={() => {
                                const curr = videoRef.current?.currentTime || 0;
                                setActiveUrl(q.videoUrl);
                                if (onActiveUrlChange) onActiveUrlChange(q.videoUrl);
                                setShowSettings(false);
                                setTimeout(() => {
                                  if (videoRef.current) {
                                    videoRef.current.currentTime = curr;
                                    videoRef.current.play().catch(() => {});
                                  }
                                }, 150);
                              }}
                              className={`w-full text-left px-2 py-1 text-xs rounded transition-colors flex items-center justify-between ${
                                isActive ? 'bg-rose-600 text-white font-bold' : 'hover:bg-white/10 text-gray-200'
                              }`}
                            >
                              <span>{q.quality}</span>
                              {isActive && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Playback Speed */}
                  <div className="border-t border-white/10 pt-1">
                    <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase">Kecepatan</p>
                    <div className="grid grid-cols-3 gap-1">
                      {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => changeSpeed(s)}
                          className={`text-center py-1 text-xs rounded transition-colors ${
                            playbackSpeed === s ? 'bg-rose-600 text-white font-bold' : 'hover:bg-white/10 text-gray-200'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:text-rose-400 transition-colors"
              title="Fullscreen"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
