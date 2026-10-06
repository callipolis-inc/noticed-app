import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Clock,
} from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  decodeAudioFile,
  extractWaveformPeaks,
  trimAudioFile,
} from "@/lib/audioProcessing";
import { MAX_AUDIO_DURATION_SECONDS } from "@/lib/mediaStorage";

interface AudioTrimmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onTrimComplete: (result: {
    blob: Blob;
    url: string;
    duration: number;
  }) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioTrimmerModal({
  isOpen,
  onClose,
  file,
  onTrimComplete,
}: AudioTrimmerModalProps) {
  const [isDecoding, setIsDecoding] = useState(true);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);

  // Selection range in seconds
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(MAX_AUDIO_DURATION_SECONDS);

  // Playback preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);

  // Dragging interaction state
  const [activeDrag, setActiveDrag] = useState<
    "start" | "end" | "window" | null
  >(null);
  const dragStartXRef = useRef<number>(0);
  const dragInitialRangeRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const waveformTrackRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const totalDuration = audioBuffer ? audioBuffer.duration : 0;
  const selectionDuration = Math.max(0.5, endTime - startTime);

  // 1. Decode Audio File on Open
  useEffect(() => {
    if (!isOpen || !file) {
      setIsDecoding(true);
      setDecodeError(null);
      setAudioBuffer(null);
      setPeaks([]);
      setIsPlaying(false);
      return;
    }

    let isMounted = true;
    setIsDecoding(true);
    setDecodeError(null);

    decodeAudioFile(file)
      .then((buffer) => {
        if (!isMounted) return;
        setAudioBuffer(buffer);
        const extractedPeaks = extractWaveformPeaks(buffer, 68);
        setPeaks(extractedPeaks);

        const initialEnd = Math.min(buffer.duration, MAX_AUDIO_DURATION_SECONDS);
        setStartTime(0);
        setEndTime(initialEnd);
        setPreviewTime(0);
        setIsDecoding(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("[AudioTrimmer] Decode error:", err);
        setDecodeError(
          "Unable to decode this audio format. Please try standard MP3, M4A, or WAV."
        );
        setIsDecoding(false);
      });

    return () => {
      isMounted = false;
      stopAudioPlayback();
    };
  }, [isOpen, file]);

  // Stop audio preview playback
  const stopAudioPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Toggle audio preview within [startTime, endTime]
  const togglePlayPreview = useCallback(() => {
    if (!audioBuffer) return;

    if (isPlaying) {
      stopAudioPlayback();
      triggerHaptic("light");
      return;
    }

    triggerHaptic("medium");
    stopAudioPlayback();

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContextClass();
    }
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    // If preview time is outside selection or at the end, restart from startTime
    let offset = previewTime;
    if (offset < startTime || offset >= endTime - 0.1) {
      offset = startTime;
      setPreviewTime(startTime);
    }

    const durationToPlay = Math.max(0.1, endTime - offset);
    source.start(0, offset, durationToPlay);
    sourceNodeRef.current = source;
    playStartTimeRef.current = audioCtx.currentTime;
    playbackOffsetRef.current = offset;
    setIsPlaying(true);

    const updatePlayhead = () => {
      if (!sourceNodeRef.current) return;
      const elapsed = audioCtx.currentTime - playStartTimeRef.current;
      const currentPos = playbackOffsetRef.current + elapsed;

      if (currentPos >= endTime) {
        setPreviewTime(startTime);
        stopAudioPlayback();
      } else {
        setPreviewTime(currentPos);
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
      }
    };
    animFrameRef.current = requestAnimationFrame(updatePlayhead);

    source.onended = () => {
      if (sourceNodeRef.current === source) {
        stopAudioPlayback();
        setPreviewTime(startTime);
      }
    };
  }, [audioBuffer, isPlaying, previewTime, startTime, endTime, stopAudioPlayback]);

  // Handle pointer scrub calculations
  const calculateTimeFromX = useCallback(
    (clientX: number): number => {
      if (!waveformTrackRef.current || totalDuration <= 0) return 0;
      const rect = waveformTrackRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return fraction * totalDuration;
    },
    [totalDuration]
  );

  // Pointer drag listeners for Left Handle, Right Handle, or Center Window
  const handlePointerDown = (
    type: "start" | "end" | "window",
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    stopAudioPlayback();
    triggerHaptic("medium");

    setActiveDrag(type);
    dragStartXRef.current = e.clientX;
    dragInitialRangeRef.current = { start: startTime, end: endTime };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag || totalDuration <= 0) return;
    const currentPos = calculateTimeFromX(e.clientX);
    const { start: initStart, end: initEnd } = dragInitialRangeRef.current;

    if (activeDrag === "start") {
      let newStart = Math.max(0, Math.min(endTime - 1, currentPos));
      // Max 3 minutes window constraint
      if (endTime - newStart > MAX_AUDIO_DURATION_SECONDS) {
        newStart = endTime - MAX_AUDIO_DURATION_SECONDS;
      }
      setStartTime(newStart);
      setPreviewTime(newStart);
    } else if (activeDrag === "end") {
      let newEnd = Math.min(totalDuration, Math.max(startTime + 1, currentPos));
      // Max 3 minutes window constraint
      if (newEnd - startTime > MAX_AUDIO_DURATION_SECONDS) {
        newEnd = startTime + MAX_AUDIO_DURATION_SECONDS;
      }
      setEndTime(newEnd);
      setPreviewTime(startTime);
    } else if (activeDrag === "window") {
      const rect = waveformTrackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaFraction = (e.clientX - dragStartXRef.current) / rect.width;
      const deltaTime = deltaFraction * totalDuration;
      const windowSize = initEnd - initStart;

      let newStart = initStart + deltaTime;
      let newEnd = initEnd + deltaTime;

      if (newStart < 0) {
        newStart = 0;
        newEnd = windowSize;
      } else if (newEnd > totalDuration) {
        newEnd = totalDuration;
        newStart = totalDuration - windowSize;
      }

      setStartTime(newStart);
      setEndTime(newEnd);
      setPreviewTime(newStart);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveDrag(null);
      triggerHaptic("light");
    }
  };

  // Reset selection to the initial 3 minutes
  const handleReset = () => {
    triggerHaptic("light");
    stopAudioPlayback();
    setStartTime(0);
    setEndTime(Math.min(totalDuration, MAX_AUDIO_DURATION_SECONDS));
    setPreviewTime(0);
  };

  // Perform client-side trim and attach
  const handleConfirmTrim = async () => {
    if (!file || !audioBuffer || isTrimming) return;

    triggerSuccessHaptic();
    setIsTrimming(true);
    stopAudioPlayback();

    try {
      const result = await trimAudioFile(file, startTime, endTime);
      onTrimComplete(result);
      onClose();
    } catch (err: unknown) {
      console.error("[AudioTrimmer] Trimming error:", err);
      setDecodeError("Failed to trim audio. Please try again.");
    } finally {
      setIsTrimming(false);
    }
  };

  if (!isOpen) return null;

  const startPercent = totalDuration > 0 ? (startTime / totalDuration) * 100 : 0;
  const endPercent = totalDuration > 0 ? (endTime / totalDuration) * 100 : 100;
  const playheadPercent =
    totalDuration > 0 ? (previewTime / totalDuration) * 100 : startPercent;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none select-none">
        {/* Dimming Ambient Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (!isTrimming) {
              triggerHaptic("light");
              stopAudioPlayback();
              onClose();
            }
          }}
          className="fixed inset-0 bg-black/45 backdrop-blur-md pointer-events-auto"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: -24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="
            pointer-events-auto relative w-full max-w-sm sm:max-w-md
            rounded-[32px] overflow-hidden z-10 flex flex-col
            bg-[var(--sheet-bg)]
            backdrop-blur-[40px] saturate-[190%]
            border border-[var(--glass-border)]
            shadow-[0_28px_64px_-12px_rgba(0,0,0,0.32),0_8px_24px_-4px_rgba(0,0,0,0.12)]
            text-[var(--text-primary)]
            p-5 sm:p-6
          "
          style={{
            marginTop: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)",
            maxHeight:
              "calc(100dvh - max(calc(env(safe-area-inset-top, 0px) + 14px), 24px) - 24px)",
          }}
        >
          {/* Top Specular Rim */}
          <div className="dynamic-island-specular-rim" />

          {/* Close Button */}
          <button
            type="button"
            disabled={isTrimming}
            onClick={() => {
              triggerHaptic("light");
              stopAudioPlayback();
              onClose();
            }}
            className="absolute top-4 right-4 w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs disabled:opacity-40"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          {/* Header */}
          <div className="text-center pt-1 pb-3 space-y-1">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] shadow-sm mb-1 text-[var(--text-primary)]">
              <Scissors className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--text-tertiary)] font-semibold">
              Archival Audio Trimmer
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Select 3-Minute Clip
            </h2>
            <p className="font-serif italic text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              Original recording exceeds the 3-minute notice folio limit. Slide
              handles to select your segment.
            </p>
          </div>

          {/* Loading or Error Fallback */}
          {isDecoding ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-1 h-8">
                {[0.4, 0.8, 0.5, 0.9, 0.6, 0.3].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [0.3, 1, 0.3] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.9,
                      delay: i * 0.12,
                      ease: "easeInOut",
                    }}
                    className="w-1 bg-[var(--text-primary)] rounded-full origin-center"
                    style={{ height: `${h * 28}px` }}
                  />
                ))}
              </div>
              <span className="text-xs font-mono text-[var(--text-tertiary)]">
                Reading audio waveform...
              </span>
            </div>
          ) : decodeError ? (
            <div className="py-8 text-center space-y-3">
              <div className="text-xs text-rose-500 font-medium px-4">
                {decodeError}
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="px-4 py-1.5 rounded-full inner-pseudo-glass text-xs font-medium text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Interactive Waveform Scrubber & Dual Handles Container */}
              <div className="my-3 space-y-2">
                {/* Time Range Stats Banner */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] px-1">
                  <span className="flex items-center gap-1 text-[var(--text-primary)] font-semibold">
                    <Clock className="w-3 h-3 stroke-[2]" />
                    <span>Clip: {formatTime(selectionDuration)}</span>
                    <span className="text-[var(--text-tertiary)] font-normal">
                      (Max 3:00)
                    </span>
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Total: {formatTime(totalDuration)}
                  </span>
                </div>

                {/* Tactile Waveform Track */}
                <div
                  ref={waveformTrackRef}
                  className="relative w-full h-24 rounded-2xl p-2 inner-pseudo-glass border border-[var(--glass-border)] overflow-hidden shadow-inner flex items-center justify-center cursor-pointer select-none touch-none"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  {/* Waveform Bars Background */}
                  <div className="absolute inset-x-2 inset-y-2 flex items-center justify-between gap-[2px] pointer-events-none">
                    {peaks.map((peak, idx) => {
                      const barPercent = (idx / peaks.length) * 100;
                      const isInSelection =
                        barPercent >= startPercent && barPercent <= endPercent;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex items-center justify-center h-full"
                        >
                          <div
                            className={`w-full rounded-full transition-colors duration-150 ${
                              isInSelection
                                ? "bg-[var(--text-primary)] opacity-90 shadow-2xs"
                                : "bg-[var(--text-primary)] opacity-20"
                            }`}
                            style={{
                              height: `${Math.max(12, peak * 82)}%`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Dimmed Overlay: Left Outside Selection */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-black/25 dark:bg-black/55 backdrop-blur-[1.5px] pointer-events-none transition-all"
                    style={{ width: `${startPercent}%` }}
                  />

                  {/* Dimmed Overlay: Right Outside Selection */}
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-black/25 dark:bg-black/55 backdrop-blur-[1.5px] pointer-events-none transition-all"
                    style={{ width: `${100 - endPercent}%` }}
                  />

                  {/* Active Selection Frame & Window Drag Handle */}
                  <div
                    onPointerDown={(e) => handlePointerDown("window", e)}
                    className="absolute top-0 bottom-0 border-y-2 border-[var(--text-primary)] bg-[var(--text-primary)]/[0.04] cursor-grab active:cursor-grabbing z-10"
                    style={{
                      left: `${startPercent}%`,
                      width: `${endPercent - startPercent}%`,
                    }}
                    title="Drag to slide 3-minute window"
                  >
                    {/* Top tactile window label */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-[9px] font-mono font-bold leading-none shadow-xs pointer-events-none whitespace-nowrap">
                      {formatTime(startTime)} – {formatTime(endTime)}
                    </div>
                  </div>

                  {/* Live Playhead Needle Indicator */}
                  {isPlaying && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                      style={{ left: `${playheadPercent}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-500" />
                    </div>
                  )}

                  {/* Left Boundary Handle */}
                  <div
                    onPointerDown={(e) => handlePointerDown("start", e)}
                    className="absolute top-0 bottom-0 -translate-x-1/2 w-7 z-30 flex items-center justify-center cursor-ew-resize touch-none group"
                    style={{ left: `${startPercent}%` }}
                    title="Drag Start handle"
                  >
                    <div className="w-3.5 h-16 rounded-full bg-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center group-active:scale-110 transition-transform border border-white/30 dark:border-white/10">
                      <div className="w-0.5 h-5 bg-[var(--accent-ink)] rounded-full opacity-70" />
                    </div>
                  </div>

                  {/* Right Boundary Handle */}
                  <div
                    onPointerDown={(e) => handlePointerDown("end", e)}
                    className="absolute top-0 bottom-0 -translate-x-1/2 w-7 z-30 flex items-center justify-center cursor-ew-resize touch-none group"
                    style={{ left: `${endPercent}%` }}
                    title="Drag End handle"
                  >
                    <div className="w-3.5 h-16 rounded-full bg-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center group-active:scale-110 transition-transform border border-white/30 dark:border-white/10">
                      <div className="w-0.5 h-5 bg-[var(--accent-ink)] rounded-full opacity-70" />
                    </div>
                  </div>
                </div>

                {/* Subtext Timestamps Bar */}
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)] px-1">
                  <span>Start: {formatTime(startTime)}</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    Preview: {formatTime(previewTime)}
                  </span>
                  <span>End: {formatTime(endTime)}</span>
                </div>
              </div>

              {/* Controls & Action Dock */}
              <div className="pt-2 space-y-3">
                {/* Preview Play/Pause & Reset Bar */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] shadow-2xs">
                  <button
                    type="button"
                    onClick={togglePlayPreview}
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-xs flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer shadow-xs"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Preview</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Selection</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-2 rounded-xl inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                    title="Reset to first 3 minutes"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>

                {/* Primary Confirm Button */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isTrimming}
                    onClick={() => {
                      triggerHaptic("light");
                      stopAudioPlayback();
                      onClose();
                    }}
                    className="flex-1 py-2.5 rounded-2xl inner-pseudo-glass text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    Discard
                  </button>

                  <button
                    type="button"
                    disabled={isTrimming}
                    onClick={handleConfirmTrim}
                    className="flex-[2] py-2.5 rounded-2xl bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.35)] disabled:opacity-50"
                  >
                    {isTrimming ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-[var(--accent-ink)] border-t-transparent rounded-full animate-spin" />
                        <span>Slicing Audio...</span>
                      </div>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Trim & Attach Notice</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
