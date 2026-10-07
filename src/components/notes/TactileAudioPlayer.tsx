import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface TactileAudioPlayerProps {
  audioUrl?: string;
  durationSeconds: number;
  sourceId: string;
  className?: string;
}

/**
 * Deterministically generates visually harmonious waveform heights
 * based on the sourceId and duration, mimicking an authentic sound wave print.
 */
function generateWaveformHeights(sourceId: string, count = 28): number[] {
  let hash = 0;
  for (let i = 0; i < sourceId.length; i++) {
    hash = (hash << 5) - hash + sourceId.charCodeAt(i);
    hash |= 0;
  }

  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    // Combine multi-frequency sine waves with seeded pseudo-random variation
    const seed = Math.abs(Math.sin((i + 1) * 12.9898 + hash) * 43758.5453) % 1;
    const wave =
      Math.sin((i / count) * Math.PI) * 0.55 +
      Math.sin((i / count) * Math.PI * 3) * 0.25 +
      0.2;
    const combined = Math.min(1, Math.max(0.18, wave * 0.7 + seed * 0.3));
    heights.push(Math.round(combined * 100));
  }
  return heights;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TactileAudioPlayer({
  audioUrl,
  durationSeconds,
  sourceId,
  className = "",
}: TactileAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);
  const collapseTimeoutRef = useRef<number | null>(null);

  const waveformBars = useMemo(
    () => generateWaveformHeights(sourceId, 28),
    [sourceId]
  );

  const effectiveDuration = durationSeconds > 0 ? durationSeconds : 1;

  // Cleanup audio and timers on unmount or URL change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
      }
    };
  }, [audioUrl]);

  // Exclusive playback: stop if another audio or video starts
  useEffect(() => {
    const handleOtherMediaPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ sourceId: string }>;
      if (customEvent.detail?.sourceId !== sourceId) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        setIsExpanded(false);
      }
    };

    window.addEventListener("noticed:media-play", handleOtherMediaPlay);
    return () => {
      window.removeEventListener("noticed:media-play", handleOtherMediaPlay);
    };
  }, [sourceId]);

  // Zero-idle memory: release audio element buffer when collapsed
  useEffect(() => {
    if (!isExpanded && audioRef.current && !isPlaying) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, [isExpanded, isPlaying]);

  const initAudioIfNeeded = useCallback(() => {
    if (!audioRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      audio.preload = "metadata";
      audio.playbackRate = playbackSpeed;

      if (currentTime > 0 && currentTime < effectiveDuration) {
        audio.currentTime = currentTime;
      }

      audio.ontimeupdate = () => {
        if (!isScrubbing && audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      };

      audio.onerror = (e) => {
        console.error("[TactileAudioPlayer] Audio playback error:", audio.error, e);
        setIsPlaying(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        triggerHaptic("light");
        // Smoothly collapse back to idle pill after a brief pause
        collapseTimeoutRef.current = window.setTimeout(() => {
          setIsExpanded(false);
        }, 1200);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      audio.onplay = () => {
        setIsPlaying(true);
      };

      audioRef.current = audio;
    }
  }, [audioUrl, playbackSpeed, isScrubbing, currentTime, effectiveDuration]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;

    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }

    initAudioIfNeeded();
    if (!audioRef.current) return;

    triggerHaptic("light");

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(
        new CustomEvent("noticed:media-play", {
          detail: { sourceId },
        })
      );
      setIsExpanded(true);
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("[TactileAudioPlayer] Playback was prevented or failed:", err);
        setIsPlaying(false);
      }
    }
  };

  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    const speeds = [1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleRestart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.error("[TactileAudioPlayer] Restart error:", err);
          setIsPlaying(false);
        }
      }
    }
  };

  // Scrubber seeking logic based on pointer position
  const seekToPosition = useCallback(
    (clientX: number) => {
      if (!scrubberTrackRef.current) return;
      const rect = scrubberTrackRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetTime = progress * effectiveDuration;
      setCurrentTime(targetTime);
      if (audioRef.current) {
        audioRef.current.currentTime = targetTime;
      }
    },
    [effectiveDuration]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;
    initAudioIfNeeded();

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsScrubbing(true);
    triggerHaptic("light");
    seekToPosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    seekToPosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    setIsScrubbing(false);
    triggerHaptic("light");
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore if pointer capture release is not supported
    }
  };

  const currentProgressRatio = Math.min(
    1,
    Math.max(0, currentTime / effectiveDuration)
  );

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      className={`relative select-none ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isExpanded ? (
          /* ============================================================
             1. IDLE COLLAPSED STRIP:
             Acoustic Letterpress Stamp — organic, unglossed, warm paper
             ============================================================ */
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            onClick={togglePlay}
            className="inline-flex items-center gap-2.5 py-1 px-3 rounded-full border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.035] hover:bg-[var(--text-primary)]/[0.06] active:scale-97 transition-all cursor-pointer shadow-2xs group"
            title="Play voice memo"
          >
            {/* Matte Ink Button */}
            <div className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs shrink-0">
              <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />
            </div>

            {/* Micro Waveform Bars (Ink Stipples) */}
            <div className="flex items-center gap-0.5 h-3 shrink-0">
              {waveformBars.slice(0, 12).map((h, i) => (
                <span
                  key={i}
                  className="w-0.5 rounded-full bg-[var(--text-secondary)] opacity-55 transition-all"
                  style={{ height: `${Math.max(3, h * 0.12)}px` }}
                />
              ))}
            </div>

            {/* Archival Monospaced Duration */}
            <span className="font-mono text-[10.5px] font-medium text-[var(--text-secondary)] tracking-tight">
              {formatDuration(effectiveDuration)}
            </span>
          </motion.div>
        ) : (
          /* ============================================================
             2. EXPANDED AUDIO MARGINALIA STRIP:
             Full interactive waveform scrubber with paper-tinted deck
             ============================================================ */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 2, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            className="w-full max-w-sm sm:max-w-md p-2.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.035] dark:bg-white/[0.04] shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col gap-2"
          >
            {/* Top Row: Playback Control, Dynamic Timer, Speed, and Reset */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Matte Ink Play/Pause Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-7 h-7 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs shrink-0"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3 fill-current" />
                  ) : (
                    <Play className="w-3 h-3 ml-0.5 fill-current" />
                  )}
                </button>

                {/* Restart Button */}
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
                  title="Restart to beginning"
                >
                  <RotateCcw className="w-3 h-3 stroke-[2]" />
                </button>

                {/* Live Running Timer */}
                <div className="flex items-center gap-1 font-mono text-[11px] font-medium tracking-tight">
                  <span className="text-[var(--text-primary)]">
                    {formatDuration(currentTime)}
                  </span>
                  <span className="text-[var(--text-tertiary)] opacity-60">
                    /
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {formatDuration(effectiveDuration)}
                  </span>
                </div>
              </div>

              {/* Right Controls: Playback Speed & Collapse Pill */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Single Cycle Speed Pill */}
                <button
                  type="button"
                  onClick={handleCycleSpeed}
                  className="px-2 py-0.5 rounded-full border border-[var(--glass-border)] bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] active:scale-95 transition-all text-[10px] font-mono font-semibold text-[var(--text-primary)] cursor-pointer tracking-tight"
                  title="Cycle playback speed"
                >
                  {playbackSpeed}×
                </button>

                {/* Collapse button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    setIsExpanded(false);
                  }}
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-serif text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-95 transition-colors cursor-pointer"
                  title="Collapse player"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Bottom Row: Tactile Interactive Waveform Scrubber */}
            <div
              ref={scrubberTrackRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-full h-8 px-1 flex items-center justify-between gap-[3px] cursor-pointer touch-none group/scrub"
              title="Drag or tap to seek"
            >
              {waveformBars.map((heightPercent, idx) => {
                const barRatio = idx / (waveformBars.length - 1);
                const isPlayed = barRatio <= currentProgressRatio;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex items-center justify-center h-full pointer-events-none"
                  >
                    <span
                      className={`w-full max-w-[3.5px] rounded-full transition-all duration-75 ${
                        isPlayed
                          ? "bg-[var(--text-primary)]"
                          : "bg-[var(--text-tertiary)]/35 dark:bg-white/20"
                      } ${
                        isPlaying && isPlayed && !isScrubbing
                          ? "opacity-95"
                          : ""
                      }`}
                      style={{
                        height: `${Math.max(4, heightPercent * 0.28)}px`,
                      }}
                    />
                  </div>
                );
              })}

              {/* Minimal Scrubber Position Needle */}
              <div
                className="absolute top-1 bottom-1 w-[2px] bg-[var(--text-primary)] rounded-full pointer-events-none transition-transform shadow-xs"
                style={{
                  left: `${currentProgressRatio * 100}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
