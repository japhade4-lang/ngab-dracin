'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Check,
  Server,
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

function selectAutoQuality(
  isMobile: boolean,
  fallbackUrl: string,
  qualities: VideoQuality[]
): { url: string; label: string } {
  if (!qualities || qualities.length === 0) {
    return { url: fallbackUrl, label: isMobile ? 'Auto' : '720p' };
  }

  const findByPref = (prefs: string[]) => {
    for (const p of prefs) {
      const match = qualities.find((q) => q.quality.toLowerCase().includes(p));
      if (match?.videoUrl) return match;
    }
    return null;
  };

  if (isMobile) {
    // On phones: prefer crisp 540p/480p (fits 360-430px screen density while cutting bandwidth ~45%)
    const mobileBest = findByPref(['540', '480', '720', '360', '1080']);
    if (mobileBest) return { url: mobileBest.videoUrl, label: mobileBest.quality };
  } else {
    // On desktop/tablet: prefer 720p or 1080p
    const desktopBest = findByPref(['720', '1080', '540', '480']);
    if (desktopBest) return { url: desktopBest.videoUrl, label: desktopBest.quality };
  }

  return { url: qualities[0]?.videoUrl || fallbackUrl, label: qualities[0]?.quality || '720p' };
}

export default function VideoPlayer({
  url,
  source = 'netshort',
  title = '',
  episodeNumber = 1,
  initialTime = 0,
  qualities = [],
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
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto resolution ('auto') vs manual quality URL override
  const [qualityMode, setQualityMode] = useState<'auto' | 'manual'>('auto');
  const [manualUrl, setManualUrl] = useState<string>(url);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [viewportReady, setViewportReady] = useState<boolean>(false);
  const [isPortraitVideo, setIsPortraitVideo] = useState<boolean>(
    source === 'dramabox' || source === 'shortmax' || source === 'netshort' || source === 'melolo'
  );
  const [useProxyFallback, setUseProxyFallback] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);
  const onActiveUrlChangeRef = useRef(onActiveUrlChange);
  const pendingResumeTimeRef = useRef<number>(initialTime);
  const qualityModeRef = useRef<'auto' | 'manual'>(qualityMode);

  useEffect(() => {
    qualityModeRef.current = qualityMode;
  }, [qualityMode]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onActiveUrlChangeRef.current = onActiveUrlChange;
  }, [onActiveUrlChange]);

  // Detect phone vs desktop once on mount (before first load) + on window resize
  useEffect(() => {
    let initialized = false;
    const updateViewport = () => {
      const mobileNow = window.innerWidth < 768;
      setIsMobileViewport((prev) => {
        if (initialized && prev !== mobileNow && qualityModeRef.current === 'auto' && videoRef.current) {
          pendingResumeTimeRef.current = videoRef.current.currentTime || 0;
        }
        return mobileNow;
      });
      if (!initialized) {
        initialized = true;
        setViewportReady(true);
      }
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Reset when episode url changes
  useEffect(() => {
    pendingResumeTimeRef.current = initialTime;
    setQualityMode('auto');
    setManualUrl(url);
    setUseProxyFallback(false);
    setHasError(false);
    setIsLoading(true);
    setCurrentTime(0);
    setBufferedTime(0);
    setDuration(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const { resolvedSourceUrl, activeQualityLabel } = useMemo(() => {
    if (qualityMode === 'manual' && manualUrl) {
      const found = qualities.find((q) => q.videoUrl === manualUrl);
      return { resolvedSourceUrl: manualUrl, activeQualityLabel: found?.quality || 'Manual' };
    }
    const autoPick = selectAutoQuality(isMobileViewport, url, qualities);
    return {
      resolvedSourceUrl: autoPick.url,
      activeQualityLabel: `Auto (${autoPick.label})`,
    };
  }, [qualityMode, manualUrl, isMobileViewport, url, qualities]);

  // Notify parent when active URL changes (for download button accuracy)
  useEffect(() => {
    if (resolvedSourceUrl && onActiveUrlChangeRef.current) {
      onActiveUrlChangeRef.current(resolvedSourceUrl);
    }
  }, [resolvedSourceUrl]);

  const resolveStreamUrl = useCallback(
    (target: string, forceProxy: boolean) => {
      if (!target) return '';
      if (target.startsWith('/') || target.includes('/api/proxy/video')) {
        return target;
      }

      const isHls = target.includes('.m3u8');
      if (isHls) {
        const videoEl = videoRef.current;
        const canNativeHls =
          !Hls.isSupported() && Boolean(videoEl?.canPlayType('application/vnd.apple.mpegurl'));
        if (canNativeHls && !forceProxy) {
          return target;
        }
        return `/api/proxy/video?url=${encodeURIComponent(target)}&source=${encodeURIComponent(source)}`;
      }

      if (forceProxy) {
        return `/api/proxy/video?url=${encodeURIComponent(target)}&source=${encodeURIComponent(source)}`;
      }

      return target;
    },
    [source]
  );

  // Main player setup effect — waits for viewportReady so mobile picks 540p/480p on byte 0 without loading 720p first
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedSourceUrl || !viewportReady) return;

    const stream = resolveStreamUrl(resolvedSourceUrl, useProxyFallback);
    if (!stream) return;

    setHasError(false);
    setIsLoading(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let waitingTimeout: NodeJS.Timeout | null = null;
    const safetyTimer = setTimeout(() => setIsLoading(false), 3000);
    let disposed = false;

    const applyPendingResume = () => {
      const resumeAt = pendingResumeTimeRef.current;
      if (resumeAt > 0 && Number.isFinite(resumeAt)) {
        if (!video.duration || resumeAt < video.duration - 1) {
          video.currentTime = resumeAt;
        }
        pendingResumeTimeRef.current = 0;
      }
    };

    const triggerFallbackOrError = () => {
      if (disposed) return;
      setIsLoading(false);
      if (!useProxyFallback && !resolvedSourceUrl.startsWith('/')) {
        pendingResumeTimeRef.current = video.currentTime || pendingResumeTimeRef.current;
        setUseProxyFallback(true);
        return;
      }
      setHasError(true);
      setErrorMessage('Video tidak dapat diputar saat ini. Coba muat ulang atau ganti resolusi.');
    };

    const handleLoadedMetadata = () => {
      if (disposed) return;
      setDuration(video.duration || 0);
      if (video.videoWidth && video.videoHeight) {
        setIsPortraitVideo(video.videoHeight > video.videoWidth);
      }
      setIsLoading(false);
      setHasError(false);
      applyPendingResume();
    };

    const handleTimeUpdate = () => {
      if (disposed) return;
      const ct = video.currentTime;
      const dur = video.duration || 0;
      setCurrentTime(ct);
      if (video.buffered.length > 0) {
        setBufferedTime(video.buffered.end(video.buffered.length - 1));
      }
      if (onTimeUpdateRef.current && dur > 0) {
        onTimeUpdateRef.current(ct, dur);
      }
    };

    const handleProgress = () => {
      if (disposed) return;
      if (video.buffered.length > 0) {
        setBufferedTime(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleWaiting = () => {
      if (waitingTimeout) clearTimeout(waitingTimeout);
      waitingTimeout = setTimeout(() => {
        if (!disposed) setIsLoading(true);
      }, 600);
    };

    const handleCanPlay = () => {
      if (waitingTimeout) clearTimeout(waitingTimeout);
      if (!disposed) setIsLoading(false);
    };

    const handlePlaying = () => {
      if (waitingTimeout) clearTimeout(waitingTimeout);
      if (!disposed) {
        setIsPlaying(true);
        setIsLoading(false);
      }
    };

    const handlePause = () => {
      if (!disposed) setIsPlaying(false);
    };

    const handleEnded = () => {
      if (disposed) return;
      setIsPlaying(false);
      if (onEndedRef.current) onEndedRef.current();
    };

    const handleError = () => {
      triggerFallbackOrError();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    if (stream.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 40 * 1000 * 1000,
          maxBufferHole: 0.5,
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 15000,
        });
        hls.loadSource(stream);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (disposed) return;
          setIsLoading(false);
          applyPendingResume();
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal || disposed) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            triggerFallbackOrError();
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = stream;
        video.play().catch(() => setIsPlaying(false));
      }
    } else {
      video.src = stream;
      video.load();
      video.play()
        .then(() => {
          if (!disposed) {
            setIsPlaying(true);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!disposed) {
            setIsPlaying(false);
            setIsLoading(false);
          }
        });
    }

    return () => {
      disposed = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);

      clearTimeout(safetyTimer);
      if (waitingTimeout) clearTimeout(waitingTimeout);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [resolvedSourceUrl, useProxyFallback, resolveStreamUrl, viewportReady]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipSeconds = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipSeconds(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipSeconds(10);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipSeconds, toggleFullscreen, toggleMute]);

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettings(false);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
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
      onDoubleClick={toggleFullscreen}
      className={`relative w-full overflow-hidden rounded-xl sm:rounded-2xl bg-black border border-white/10 shadow-2xl group select-none flex items-center justify-center ${
        isPortraitVideo
          ? 'aspect-[9/16] max-h-[74dvh] sm:max-h-[78vh] sm:aspect-video'
          : 'aspect-video max-h-[78vh]'
      }`}
    >
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        onClick={togglePlay}
        className="h-full w-full object-contain cursor-pointer bg-black"
      />

      {/* Loading Spinner */}
      {isLoading && isPlaying && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 pointer-events-none z-20">
          <Loader2 className="h-10 w-10 text-rose-500 animate-spin mb-2" />
          <p className="text-xs font-semibold text-gray-300">Memuat Episode {episodeNumber}...</p>
        </div>
      )}

      {/* Error Box */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 p-6 text-center space-y-3 z-30">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <h3 className="text-sm sm:text-base font-bold text-white">Gagal Memutar Video</h3>
          <p className="text-xs text-gray-400 max-w-sm">{errorMessage}</p>
          <button
            onClick={() => {
              setHasError(false);
              setUseProxyFallback((prev) => !prev);
            }}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-all shadow"
          >
            <RefreshCw className="h-4 w-4" />
            {useProxyFallback ? 'Coba Direct CDN' : 'Coba Server Proxy VPS'}
          </button>
        </div>
      )}

      {/* Center Big Play Button */}
      {!isPlaying && !hasError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 cursor-pointer backdrop-blur-[1px] transition-all z-10"
        >
          <div className="flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-2xl shadow-rose-600/50 hover:scale-110 transition-transform">
            <Play className="h-7 w-7 sm:h-9 sm:w-9 fill-white ml-1" />
          </div>
          <span className="mt-2.5 text-[11px] sm:text-xs font-semibold text-white bg-black/60 px-3 py-1 rounded-full">
            Putar Video
          </span>
        </div>
      )}

      {/* Top Overlay Header */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between text-white gap-2">
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold drop-shadow truncate">{title}</h2>
            <p className="text-[11px] sm:text-xs text-rose-400 font-semibold">Episode {episodeNumber}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-200 border border-white/10 whitespace-nowrap">
              {activeQualityLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <div className="relative mb-2.5 flex items-center">
          <div className="absolute inset-x-0 h-1.5 bg-white/20 rounded-lg overflow-hidden pointer-events-none">
            <div
              className="h-full bg-white/30 transition-all duration-300"
              style={{
                width: `${duration > 0 ? Math.min(100, (bufferedTime / duration) * 100) : 0}%`,
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-transparent rounded-lg appearance-none cursor-pointer accent-rose-500 relative z-10"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2 sm:gap-3.5">
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

            <button onClick={toggleMute} className="p-1 hover:text-rose-400 transition-colors">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <span className="text-[11px] sm:text-xs text-gray-300 font-mono whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Quality / Speed / Server Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors whitespace-nowrap"
              >
                <span>{playbackSpeed}x</span>
                <Settings className="h-3.5 w-3.5" />
              </button>

              {showSettings && (
                <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-gray-900/95 border border-white/10 p-2 shadow-2xl backdrop-blur-md space-y-2 z-50">
                  {qualities && qualities.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase">Resolusi</p>
                      <div className="space-y-0.5">
                        <button
                          onClick={() => {
                            pendingResumeTimeRef.current = videoRef.current?.currentTime || 0;
                            setQualityMode('auto');
                            setShowSettings(false);
                          }}
                          className={`w-full text-left px-2 py-1 text-xs rounded transition-colors flex items-center justify-between ${
                            qualityMode === 'auto' ? 'bg-rose-600 text-white font-bold' : 'hover:bg-white/10 text-gray-200'
                          }`}
                        >
                          <span>Auto ({isMobileViewport ? 'Ponsel' : 'Desktop'})</span>
                          {qualityMode === 'auto' && <Check className="h-3 w-3" />}
                        </button>
                        {qualities.map((q) => {
                          const isActive = qualityMode === 'manual' && manualUrl === q.videoUrl;
                          return (
                            <button
                              key={q.quality}
                              onClick={() => {
                                pendingResumeTimeRef.current = videoRef.current?.currentTime || 0;
                                setManualUrl(q.videoUrl);
                                setQualityMode('manual');
                                setShowSettings(false);
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

                  {!resolvedSourceUrl.includes('.m3u8') && (
                    <div className="border-t border-white/10 pt-1">
                      <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase">Server</p>
                      <button
                        onClick={() => {
                          pendingResumeTimeRef.current = videoRef.current?.currentTime || 0;
                          setUseProxyFallback((prev) => !prev);
                          setShowSettings(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs rounded bg-white/5 hover:bg-white/15 text-gray-200 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5 text-rose-400" />
                          {useProxyFallback ? 'Proxy VPS' : 'Direct CDN'}
                        </span>
                        <span className="text-[10px] text-rose-400">Ganti</span>
                      </button>
                    </div>
                  )}
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
