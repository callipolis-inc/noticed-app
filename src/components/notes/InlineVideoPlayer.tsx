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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showCenterIndicator, setShowCenterIndicator] = useState(false);

  // IntersectionObserver: Smart Viewport Autoplay
  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            video.play().then(() => setIsPlaying(true)).catch(() => {
              // Autoplay policy fallback
              setIsPlaying(false);
            });
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: [0, 0.4, 0.8] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  // Track playback time for hairline progress bar
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  // Tap video to toggle play/pause
  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    triggerHaptic("light");
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
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
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
      className={`
        relative overflow-hidden rounded-2xl select-none cursor-pointer group
        bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]
        shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)]
        dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]
        ${aspectRatio} ${className}
      `}
    >
      {/* Specular hairline top reflection */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none z-10" />

      {/* HTML5 Video element with iOS playsInline */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        webkit-playsinline="true"
        loop
        muted={isMuted}
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
          absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5
          transition-opacity duration-200
          ${isHovered || !isPlaying ? "opacity-100" : "opacity-80 hover:opacity-100"}
        `}
      >
        {/* Sound Toggle Pill */}
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className="
            px-2.5 py-1 rounded-full dynamic-island-shell
            flex items-center gap-1 text-[11px] font-sans font-medium text-[var(--text-primary)]
            shadow-[0_2px_8px_rgba(0,0,0,0.18)] border border-[var(--glass-border)]
            hover:scale-105 active:scale-95 transition-transform cursor-pointer
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
