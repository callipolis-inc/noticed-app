import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface InlineVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  aspectRatio?: string;
}

export function InlineVideoPlayer({
  src,
  poster,
  className = "",
  aspectRatio = "aspect-video",
}: InlineVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef<string>(`video-${Math.random().toString(36).slice(2, 9)}`);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showCenterIndicator, setShowCenterIndicator] = useState(false);

  // Listen to global exclusive media playback event
  useEffect(() => {
    const handleOtherMediaPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ sourceId: string }>;
      if (customEvent.detail?.sourceId !== playerIdRef.current) {
        const video = videoRef.current;
        if (video && !video.paused) {
          video.pause();
          setIsPlaying(false);
        }
      }
    };
    window.addEventListener("noticed:media-play", handleOtherMediaPlay);
    return () => window.removeEventListener("noticed:media-play", handleOtherMediaPlay);
  }, []);

  // Pause video when app enters background to release GPU decoder and conserve battery
  useEffect(() => {
    const handlePause = () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        video.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener("noticed:app-background", handlePause);
    window.addEventListener("noticed:media-pause", handlePause);
    return () => {
      window.removeEventListener("noticed:app-background", handlePause);
      window.removeEventListener("noticed:media-pause", handlePause);
    };
  }, []);

  // Hardware Decoder Guard: only load media stream when near viewport
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const nearObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsNearViewport(entry.isIntersecting);
        if (!entry.isIntersecting && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      { rootMargin: "350px" }
    );

    nearObserver.observe(el);
    return () => nearObserver.disconnect();
  }, []);

  const autoplayTimerRef = useRef<number | null>(null);

  // IntersectionObserver: Smart Viewport Autoplay when visible & scroll settles
  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video || !isNearViewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            if (autoplayTimerRef.current) {
              window.clearTimeout(autoplayTimerRef.current);
            }
            autoplayTimerRef.current = window.setTimeout(() => {
              if (videoRef.current && videoRef.current.paused) {
                videoRef.current
                  .play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {
                    setIsPlaying(false);
                  });
              }
            }, 250);
          } else {
            if (autoplayTimerRef.current) {
              window.clearTimeout(autoplayTimerRef.current);
              autoplayTimerRef.current = null;
            }
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: [0, 0.55, 0.85] }
    );

    observer.observe(el);
    return () => {
      if (autoplayTimerRef.current) {
        window.clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
      observer.disconnect();
    };
  }, [src, isNearViewport]);

  // Track playback time for hairline progress bar
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  // Tap video to toggle play/pause
  const togglePlay = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    triggerHaptic("light");
    if (video.paused) {
      window.dispatchEvent(
        new CustomEvent("noticed:media-play", {
          detail: { sourceId: playerIdRef.current },
        })
      );
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn("[InlineVideoPlayer] Play interrupted or blocked:", err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }

    // Flash center indicator
    setShowCenterIndicator(true);
    setTimeout(() => setShowCenterIndicator(false), 600);
  }, []);

  // Toggle Mute / Sound
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    triggerHaptic("medium");
    const nextMuted = !video.muted;
    if (!nextMuted) {
      window.dispatchEvent(
        new CustomEvent("noticed:media-play", {
          detail: { sourceId: playerIdRef.current },
        })
      );
    }
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={isPlaying ? "Jeda video" : "Putar video"}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          togglePlay();
        }
      }}
      className={`
        relative overflow-hidden rounded-2xl select-none cursor-pointer group
        bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]
        shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)]
        dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]
        ${aspectRatio} ${className}
      `}
    >
      {/* Specular hairline top reflection */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none z-10" />

      {/* HTML5 Video element with iOS playsInline & metadata preload */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        webkit-playsinline="true"
        loop
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full object-cover rounded-2xl block"
      />

      {/* Center Tap Play/Pause Indicator (Fades out) */}
      <div
        className={`
          absolute inset-0 flex items-center justify-center pointer-events-none z-20
          transition-opacity duration-300
          ${showCenterIndicator || !isPlaying ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className="w-12 h-12 rounded-full dynamic-island-shell flex items-center justify-center text-[var(--text-primary)] shadow-lg backdrop-blur-md">
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </div>
      </div>

      {/* Floating Micro-Capsule Controls (Bottom-Right) */}
      <div
        className={`
          absolute bottom-3.5 right-3.5 z-20 flex items-center gap-1.5
          transition-opacity duration-200
          ${isHovered || !isPlaying ? "opacity-100" : "opacity-80 hover:opacity-100"}
        `}
      >
        {/* Sound Toggle Pill */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Bunyikan video (Unmute)" : "Bisukan video (Mute)"}
          title={isMuted ? "Unmute" : "Mute"}
          className="
            relative px-3 py-1.5 min-h-[34px] rounded-full dynamic-island-shell
            flex items-center gap-1.5 text-[11px] font-sans font-medium text-[var(--text-primary)]
            shadow-[0_2px_10px_rgba(0,0,0,0.22)] border border-[var(--glass-border)]
            hover:scale-105 active:scale-95 transition-transform cursor-pointer
            before:absolute before:-inset-2 before:content-['']
          "
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-mono tracking-wider">Audio</span>
            </>
          )}
        </button>
      </div>

      {/* Hairline Progress Bar */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/20 dark:bg-white/10 z-20 pointer-events-none">
        <div
          className="h-full bg-[var(--text-primary)] transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
