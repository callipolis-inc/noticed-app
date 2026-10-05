import { useState, useRef, useEffect } from "react";
import { FieldNote } from "@/types";
import { formatNoteDate } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import {
  MapPin,
  Play,
  Pause,
  Pin,
  Heart,
  Film,
  Grid2X2,
  Sparkles,
} from "lucide-react";

interface NoteCardProps {
  note: FieldNote;
  spaceName?: string;
  onPinToggle?: (id: string) => void;
  onOpenPhotostrip?: (note: FieldNote) => void;
  onLayoutChange?: (
    noteId: string,
    layout: "polaroid" | "strip" | "grid",
  ) => void;
}

export function NoteCard({
  note,
  spaceName,
  onPinToggle,
  onOpenPhotostrip,
  onLayoutChange,
}: NoteCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<
    "polaroid" | "strip" | "grid"
  >(
    note.photostripLayout ||
      (note.photos && note.photos.length === 1 ? "polaroid" : "grid"),
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (note.voiceMemo?.audioUrl) {
      const audio = new Audio(note.voiceMemo.audioUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioProgress(0);
      };

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [note.voiceMemo?.audioUrl]);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");

    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play().catch(console.error);
        setIsPlayingAudio(true);
      }
    } else {
      setIsPlayingAudio(!isPlayingAudio);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("medium");
    setLiked(!liked);
  };

  const handleCycleLayout = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    const layouts: ("grid" | "strip" | "polaroid")[] = [
      "grid",
      "strip",
      "polaroid",
    ];
    const nextIdx = (layouts.indexOf(currentLayout) + 1) % layouts.length;
    const nextLayout = layouts[nextIdx];
    setCurrentLayout(nextLayout);
    if (onLayoutChange) {
      onLayoutChange(note.id, nextLayout);
    }
  };

  const hasPhotos = Boolean(note.photos && note.photos.length > 0);

  return (
    <article
      className="
        group relative rounded-[26px] p-4.5 sm:p-5
        apple-card border border-[var(--glass-border)]
        shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]
        transition-all duration-300 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.1)]
        select-none text-[var(--text-primary)]
      "
    >
      {/* Header: Date + Space Tag + Micro Action Cluster */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <time
            dateTime={note.createdAt}
            className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-medium shrink-0"
          >
            {formatNoteDate(note.createdAt)}
          </time>

          {spaceName && (
            <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full inner-pseudo-glass text-[var(--text-secondary)] truncate border border-[var(--glass-border)]/50 shadow-2xs">
              {spaceName}
            </span>
          )}
        </div>

        {/* Micro Tactile Glass Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Photostrip View / Export Button */}
          {hasPhotos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                onOpenPhotostrip?.(note);
              }}
              className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
              title="Open Photostrip Studio"
            >
              <Film className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>
          )}

          {/* Toggle Photo Layout */}
          {hasPhotos && note.photos!.length > 1 && (
            <button
              type="button"
              onClick={handleCycleLayout}
              className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
              title={`Layout: ${currentLayout} (tap to cycle)`}
            >
              <Grid2X2 className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>
          )}

          {/* Pin / Bookmark Button */}
          {onPinToggle ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                onPinToggle(note.id);
              }}
              className={`w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-xs ${
                note.pinned
                  ? "text-[var(--text-primary)] font-bold shadow-xs"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
              title={note.pinned ? "Unpin note" : "Pin note"}
            >
              <Pin
                className={`w-3.5 h-3.5 rotate-45 ${note.pinned ? "fill-current" : ""}`}
              />
            </button>
          ) : note.pinned ? (
            <span className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-primary)] opacity-70">
              <Pin className="w-3.5 h-3.5 rotate-45 fill-current" />
            </span>
          ) : null}

          {/* Heart / Favorite Button */}
          <button
            type="button"
            onClick={handleLike}
            className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-xs"
            title={liked ? "Unlike" : "Like"}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                liked
                  ? "fill-rose-500 text-rose-500"
                  : "text-[var(--text-tertiary)] hover:text-rose-500"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Note Content / Prose */}
      {note.content && (
        <div className="font-content text-[14px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap selection:bg-[var(--text-primary)] selection:text-[var(--bg-base)]">
          {note.content}
        </div>
      )}

      {/* Attached Photos Layouts */}
      {hasPhotos && (
        <div className="mt-3.5">
          {/* 1. POLAROID FRAME LAYOUT */}
          {currentLayout === "polaroid" && (
            <div className="space-y-3">
              {note.photos!.map((photoUrl, index) => (
                <div
                  key={index}
                  onClick={() => onOpenPhotostrip?.(note)}
                  className="
                    cursor-pointer relative p-2.5 pb-3.5 rounded-2xl
                    bg-white dark:bg-[#1f1f24] border border-[var(--glass-border)]/70
                    shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.04)]
                    transition-transform hover:scale-[1.01] active:scale-[0.99]
                  "
                >
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/5 border border-black/5 dark:border-white/5">
                    <img
                      src={photoUrl}
                      alt="Polaroid capture"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)] px-1">
                    <span>{formatNoteDate(note.createdAt)}</span>
                    <span className="flex items-center gap-1 opacity-70">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>polaroid</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. VERTICAL FILMSTRIP LAYOUT */}
          {currentLayout === "strip" && (
            <div
              onClick={() => onOpenPhotostrip?.(note)}
              className="
                cursor-pointer p-2 rounded-2xl apple-card border border-[var(--glass-border)]
                space-y-2 hover:border-[var(--text-primary)]/20 transition-all shadow-xs
              "
            >
              {note.photos!.map((photoUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-[16/9] rounded-xl overflow-hidden bg-black/10 border border-white/10"
                >
                  <img
                    src={photoUrl}
                    alt="Filmstrip frame"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 text-[9px] font-mono bg-black/60 text-white/95 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                    0{index + 1}
                  </span>
                </div>
              ))}
              <div className="text-center py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-center gap-1.5">
                <Film className="w-3 h-3 opacity-70" />
                <span>View full photostrip</span>
              </div>
            </div>
          )}

          {/* 3. GRID LAYOUT */}
          {currentLayout === "grid" && (
            <div
              className={`grid gap-2.5 ${
                note.photos!.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {note.photos!.map((photoUrl, index) => (
                <div
                  key={index}
                  onClick={() => onOpenPhotostrip?.(note)}
                  className="
                    cursor-pointer relative rounded-2xl overflow-hidden aspect-[4/3]
                    border border-[var(--glass-border)]/70 bg-black/5
                    shadow-[0_6px_16px_-4px_rgba(0,0,0,0.08)]
                    transition-transform hover:scale-[1.01] active:scale-[0.99]
                  "
                >
                  <img
                    src={photoUrl}
                    alt="Field note capture"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audio Voice Memo Pill */}
      {note.voiceMemo && (
        <div className="relative overflow-hidden mt-3.5 p-2.5 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleAudio}
                className="w-7 h-7 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] flex items-center justify-center transition-transform active:scale-90 shadow-xs cursor-pointer"
                title={isPlayingAudio ? "Pause" : "Play"}
              >
                {isPlayingAudio ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>

              {/* Reactive Audio Bars */}
              <div className="flex items-center gap-1 h-3.5">
                {[40, 75, 55, 90, 60, 30, 80, 45, 70, 50, 85, 40].map(
                  (h, i) => (
                    <span
                      key={i}
                      className={`w-0.5 rounded-full transition-all duration-300 ${
                        isPlayingAudio
                          ? "bg-[var(--text-primary)] animate-pulse"
                          : "bg-[var(--text-tertiary)] opacity-60"
                      }`}
                      style={{ height: `${Math.max(3, h * 0.16)}px` }}
                    />
                  ),
                )}
              </div>
            </div>

            <span className="text-[10.5px] font-mono text-[var(--text-tertiary)]">
              0:{note.voiceMemo.durationSeconds.toString().padStart(2, "0")}
            </span>
          </div>

          {audioProgress > 0 && (
            <div
              className="absolute bottom-0 left-0 h-[2px] bg-[var(--text-primary)]/50 transition-all duration-150"
              style={{ width: `${audioProgress}%` }}
            />
          )}
        </div>
      )}

      {/* Footer: Author & Location */}
      {(note.locationName || note.author) && (
        <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-[var(--glass-border)]/50 text-[11px] text-[var(--text-tertiary)]">
          {note.locationName ? (
            <span className="flex items-center gap-1 text-[var(--text-secondary)]">
              <MapPin className="w-3 h-3 opacity-70" />
              <span>{note.locationName}</span>
            </span>
          ) : (
            <span />
          )}

          {note.author && (
            <span className="font-mono text-[10px] opacity-75">
              by {note.author.name}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
