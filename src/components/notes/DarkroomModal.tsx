import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilmFilter, PhotoMeta } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  X,
  Sliders,
  Check,
  Type,
  Sparkles,
  RectangleHorizontal,
  Square,
  RotateCcw,
} from "lucide-react";

interface DarkroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  photoIndex: number;
  initialMeta?: PhotoMeta;
  onSave: (photoIndex: number, meta: PhotoMeta) => void;
}

interface FilterPresetOption {
  id: FilmFilter;
  label: string;
  sublabel: string;
  filterClass: string;
}

const FILTER_PRESETS: FilterPresetOption[] = [
  {
    id: "natural",
    label: "Natural",
    sublabel: "As captured",
    filterClass: "film-filter-natural",
  },
  {
    id: "silver",
    label: "Silver",
    sublabel: "High contrast B&W",
    filterClass: "film-filter-silver",
  },
  {
    id: "trix",
    label: "Tri-X",
    sublabel: "Moody analog grain",
    filterClass: "film-filter-trix",
  },
  {
    id: "sepia",
    label: "Sepia '74",
    sublabel: "Warm archival tone",
    filterClass: "film-filter-sepia",
  },
  {
    id: "editorial",
    label: "Linen",
    sublabel: "Muted highlights",
    filterClass: "film-filter-editorial",
  },
];

export function DarkroomModal({
  isOpen,
  onClose,
  photoUrl,
  photoIndex,
  initialMeta,
  onSave,
}: DarkroomModalProps) {
  const [filter, setFilter] = useState<FilmFilter>(
    initialMeta?.filter || "natural",
  );
  const [frameMode, setFrameMode] = useState<"polaroid" | "borderless">(
    initialMeta?.frameMode || "polaroid",
  );
  const [caption, setCaption] = useState<string>(initialMeta?.caption || "");
  const [hasGrain, setHasGrain] = useState<boolean>(
    initialMeta?.hasGrain ?? true,
  );

  // Sync state whenever modal opens or photo changes
  useEffect(() => {
    if (isOpen) {
      setFilter(initialMeta?.filter || "natural");
      setFrameMode(initialMeta?.frameMode || "polaroid");
      setCaption(initialMeta?.caption || "");
      setHasGrain(initialMeta?.hasGrain ?? true);
    }
  }, [isOpen, initialMeta]);

  if (!isOpen) return null;

  const currentPreset =
    FILTER_PRESETS.find((p) => p.id === filter) || FILTER_PRESETS[0];

  const handleApply = () => {
    triggerSuccessHaptic();
    onSave(photoIndex, {
      url: photoUrl,
      filter,
      frameMode,
      caption: caption.trim() || undefined,
      hasGrain,
    });
    onClose();
  };

  const handleReset = () => {
    triggerHaptic("light");
    setFilter("natural");
    setFrameMode("borderless");
    setCaption("");
    setHasGrain(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl apple-card shadow-2xl border border-[var(--glass-border)] overflow-hidden flex flex-col z-10 my-auto"
          style={{
            maxHeight: "min(92dvh, 740px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--glass-border)] shrink-0 bg-[var(--bg-elevated)]/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--text-secondary)] stroke-[2.2]" />
              <span className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
                Analog Darkroom
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] ml-1">
                Plate #{photoIndex + 1}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReset}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
                title="Reset to natural"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar">
            {/* Live Preview Display Stage */}
            <div className="flex justify-center items-center py-2 bg-black/[0.03] dark:bg-white/[0.02] rounded-2xl p-3 border border-[var(--glass-border)]/50">
              {frameMode === "polaroid" ? (
                /* Polaroid Paper Frame */
                <div className="polaroid-frame-card p-3 pb-5 rounded-2xl w-full max-w-[280px] sm:max-w-[300px]">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black/10">
                    <img
                      src={photoUrl}
                      alt="Darkroom plate preview"
                      className={`w-full h-full object-cover transition-all duration-300 ${currentPreset.filterClass}`}
                    />
                    {hasGrain && <div className="film-grain-overlay" />}
                  </div>

                  {/* Polaroid Typewriter Caption Bottom Margin */}
                  <div className="pt-3 px-0.5 flex items-baseline justify-between gap-2 border-t border-[var(--text-primary)]/10 mt-2.5">
                    <p className="font-typewriter text-[11.5px] tracking-tight leading-snug truncate flex-1 opacity-90">
                      {caption.trim() || "— untitled plate —"}
                    </p>
                    <span className="font-typewriter text-[9.5px] uppercase tracking-wider opacity-60 shrink-0">
                      {filter.toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : (
                /* Classic Borderless Frame */
                <div className="w-full max-w-[280px] sm:max-w-[300px] space-y-2">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md border border-[var(--glass-border)]">
                    <img
                      src={photoUrl}
                      alt="Darkroom plate preview"
                      className={`w-full h-full object-cover transition-all duration-300 ${currentPreset.filterClass}`}
                    />
                    {hasGrain && <div className="film-grain-overlay" />}
                  </div>
                  {caption.trim() && (
                    <p className="font-serif italic text-center text-xs text-[var(--text-secondary)]">
                      {caption}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 1. Film Emulsion Filters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="font-mono uppercase tracking-wider text-[11px] font-semibold text-[var(--text-secondary)]">
                  Film Emulsion
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] italic">
                  {currentPreset.sublabel}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {FILTER_PRESETS.map((p) => {
                  const isActive = filter === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setFilter(p.id);
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-mono text-center transition-all cursor-pointer ${
                        isActive
                          ? "bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold shadow-sm active:scale-95"
                          : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30 active:scale-95"
                      }`}
                    >
                      <span className="block truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Typewriter Inscription Caption */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="font-mono uppercase tracking-wider text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  <span>Typewriter Inscription</span>
                </span>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  {caption.length}/55
                </span>
              </div>

              <input
                type="text"
                value={caption}
                maxLength={55}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Kyoto morning fog, Autumn 1974..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] text-xs font-typewriter focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/50 text-[var(--text-primary)] transition-all placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            {/* 3. Physical Attributes (Frame Mode & Grain) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Frame Mode Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setFrameMode((prev) =>
                    prev === "polaroid" ? "borderless" : "polaroid",
                  );
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  frameMode === "polaroid"
                    ? "border-[var(--text-primary)]/30 bg-[var(--text-primary)]/[0.04]"
                    : "border-[var(--glass-border)] inner-pseudo-glass"
                }`}
              >
                <div className="flex items-center justify-between">
                  {frameMode === "polaroid" ? (
                    <Square className="w-4 h-4 text-[var(--text-primary)]" />
                  ) : (
                    <RectangleHorizontal className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                  {frameMode === "polaroid" && (
                    <span className="w-2 h-2 rounded-full bg-[var(--text-primary)]" />
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-semibold block text-[var(--text-primary)]">
                    Polaroid Card
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] block">
                    {frameMode === "polaroid"
                      ? "Linen paper frame"
                      : "Borderless photo"}
                  </span>
                </div>
              </button>

              {/* Physical Grain Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setHasGrain((prev) => !prev);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  hasGrain
                    ? "border-[var(--text-primary)]/30 bg-[var(--text-primary)]/[0.04]"
                    : "border-[var(--glass-border)] inner-pseudo-glass"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkles
                    className={`w-4 h-4 ${
                      hasGrain
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  />
                  {hasGrain && (
                    <span className="w-2 h-2 rounded-full bg-[var(--text-primary)]" />
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-semibold block text-[var(--text-primary)]">
                    Analog Grain
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] block">
                    {hasGrain ? "Physical emulsion noise" : "Clean digital"}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Footer Action */}
          <div
            className="p-4 border-t border-[var(--glass-border)] bg-[var(--bg-elevated)]/90 backdrop-blur-sm flex items-center justify-end gap-2.5 shrink-0"
            style={{
              paddingBottom:
                "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 16px)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-base)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Apply to Photo</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
