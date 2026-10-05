import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space, FieldNote, FilterCategory } from "@/types";
import { formatTimeOnly } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import {
  Search,
  X,
  Camera,
  Mic,
  Pin,
  BookOpen,
  CornerDownLeft,
} from "lucide-react";

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: Space[];
  notes: FieldNote[];
  activeSpaceId?: string;
  onSelectNote: (spaceId: string, noteId: string) => void;
}

const CATEGORY_FILTERS: {
  id: FilterCategory;
  label: string;
  icon?: React.ElementType;
}[] = [
  { id: "all", label: "All" },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "voice", label: "Audio", icon: Mic },
  { id: "marginalia", label: "Sidenotes" },
  { id: "pinned", label: "Pinned", icon: Pin },
];

const TIMEFRAME_FILTERS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
] as const;

export function SpotlightSearchModal({
  isOpen,
  onClose,
  spaces,
  notes,
  activeSpaceId,
  onSelectNote,
}: SpotlightSearchModalProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FilterCategory>("all");
  const [timeframe, setTimeframe] = useState<
    "all" | "today" | "week" | "month"
  >("all");
  const [scope, setScope] = useState<"all" | "current">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setCategory("all");
      setTimeframe("all");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  const spacesMap = useMemo(() => {
    const map = new Map<string, Space>();
    spaces.forEach((s) => map.set(s.id, s));
    return map;
  }, [spaces]);

  const currentSpace = activeSpaceId ? spacesMap.get(activeSpaceId) : undefined;

  // Filter & match logic
  const filteredNotes = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    return notes.filter((note) => {
      // 1. Scope filter
      if (
        scope === "current" &&
        activeSpaceId &&
        note.spaceId !== activeSpaceId
      ) {
        return false;
      }

      // 2. Category filter
      if (category === "photos" && (!note.photos || note.photos.length === 0)) {
        return false;
      }
      if (category === "voice" && !note.voiceMemo) {
        return false;
      }
      if (
        category === "marginalia" &&
        !note.marginalia &&
        (!note.marginaliaItems || note.marginaliaItems.length === 0)
      ) {
        return false;
      }
      if (category === "pinned" && !note.pinned) {
        return false;
      }

      // 3. Timeframe filter
      if (timeframe !== "all") {
        const noteDate = new Date(note.createdAt);
        const now = new Date();
        if (timeframe === "today") {
          if (noteDate.toDateString() !== now.toDateString()) return false;
        } else if (timeframe === "week") {
          const diffDays =
            (now.getTime() - noteDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (timeframe === "month") {
          const diffDays =
            (now.getTime() - noteDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }

      // 4. Query search match
      if (!trimmed) return true;

      const title = note.title?.toLowerCase() || "";
      const spaceName = spacesMap.get(note.spaceId)?.name.toLowerCase() || "";
      const content = note.content.toLowerCase();
      const marginalia = note.marginalia?.toLowerCase() || "";
      const quoteSource = note.quoteSource?.toLowerCase() || "";
      const location = note.locationName?.toLowerCase() || "";

      return (
        title.includes(trimmed) ||
        content.includes(trimmed) ||
        marginalia.includes(trimmed) ||
        quoteSource.includes(trimmed) ||
        spaceName.includes(trimmed) ||
        location.includes(trimmed)
      );
    });
  }, [notes, query, category, timeframe, scope, activeSpaceId, spacesMap]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredNotes.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredNotes[selectedIndex]) {
          const target = filteredNotes[selectedIndex];
          triggerHaptic("medium");
          onSelectNote(target.spaceId, target.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredNotes, selectedIndex, onClose, onSelectNote]);

  const highlightMatch = (text: string, searchStr: string) => {
    if (!searchStr.trim()) return text;
    const parts = text.split(
      new RegExp(
        `(${searchStr.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`,
        "gi",
      ),
    );
    return parts.map((part, i) =>
      part.toLowerCase() === searchStr.toLowerCase() ? (
        <span
          key={i}
          className="bg-[var(--text-primary)]/15 font-semibold text-[var(--text-primary)] rounded-xs px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none">
          {/* Subtle Dimming Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 backdrop-blur-[6px] pointer-events-auto"
          />

          {/* Top Floating Spotlight Island */}
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="
              pointer-events-auto relative w-full max-w-lg
              dynamic-island-shell overflow-hidden z-10 flex flex-col
              shadow-[0_24px_50px_-12px_rgba(0,0,0,0.22),0_8px_20px_-4px_rgba(0,0,0,0.1)]
            "
            style={{
              marginTop:
                "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
              maxHeight:
                "calc(100dvh - max(calc(env(safe-area-inset-top, 0px) + 12px), 20px) - 24px)",
            }}
          >
            {/* Specular Rim Light */}
            <div className="dynamic-island-specular-rim" />

            {/* Header: Search Input & Streamlined Filters */}
            <div className="p-3.5 pb-2.5 border-b border-[var(--glass-border)]/40 space-y-2.5 relative z-10">
              {/* Row 1: Search Bar */}
              <div className="flex items-center gap-2 px-1">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0 opacity-70" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder={
                    scope === "current" && currentSpace
                      ? `In ${currentSpace.name}...`
                      : "Search notes, marginalia, audio..."
                  }
                  className="flex-1 bg-transparent border-0 p-0 text-[15px] font-sans text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 focus:outline-none tracking-tight"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs shrink-0"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.2]" />
                </button>
              </div>

              {/* Row 2: Unified Filter Ribbon (Categories + Timeframe + Scope) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--glass-border)]/40 text-xs">
                {/* Horizontal Scroll Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                  {/* Category Pills */}
                  {CATEGORY_FILTERS.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setCategory(cat.id);
                          setSelectedIndex(0);
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 shrink-0 transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.25)]"
                            : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-xs"
                        }`}
                      >
                        {Icon && <Icon className="w-3 h-3 stroke-[2]" />}
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}

                  {/* Divider */}
                  <div className="w-[1px] h-3 bg-[var(--glass-border)] mx-1 shrink-0 opacity-70" />

                  {/* Timeframe Chips (Clicking active toggles off to 'all') */}
                  {TIMEFRAME_FILTERS.map((tf) => {
                    const isActive = timeframe === tf.id;
                    return (
                      <button
                        key={tf.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setTimeframe((prev) =>
                            prev === tf.id ? "all" : tf.id,
                          );
                          setSelectedIndex(0);
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.25)]"
                            : "inner-pseudo-glass text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shadow-xs"
                        }`}
                      >
                        {tf.label}
                      </button>
                    );
                  })}
                </div>

                {/* Scope Switcher (Buku Saat Ini vs Semua Buku) */}
                {activeSpaceId && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setScope((prev) => (prev === "all" ? "current" : "all"));
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                      scope === "current"
                        ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                        : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-xs"
                    }`}
                    title="Switch search scope"
                  >
                    <BookOpen className="w-3 h-3 stroke-[2] shrink-0" />
                    <span className="truncate max-w-[90px]">
                      {scope === "current"
                        ? currentSpace?.name || "This Book"
                        : "All Books"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Results Match List */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1.5 relative z-10"
            >
              {filteredNotes.length === 0 ? (
                <div className="py-14 text-center space-y-1">
                  <p className="text-sm font-serif italic text-[var(--text-tertiary)]">
                    {query
                      ? `No notes matching "${query}"`
                      : "No notes found in this filter"}
                  </p>
                  <span className="text-[11px] text-[var(--text-tertiary)]/70">
                    Try another keyword or change your filters
                  </span>
                </div>
              ) : (
                filteredNotes.map((note, idx) => {
                  const space = spacesMap.get(note.spaceId);
                  const isSelected = idx === selectedIndex;
                  const hasPhotos = Boolean(
                    note.photos && note.photos.length > 0,
                  );
                  const hasMarginalia = Boolean(
                    note.marginalia ||
                    (note.marginaliaItems && note.marginaliaItems.length > 0),
                  );

                  return (
                    <div
                      key={note.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        triggerHaptic("medium");
                        onSelectNote(note.spaceId, note.id);
                      }}
                      className={`
                        p-3 rounded-2xl cursor-pointer transition-all duration-150 select-none border
                        ${
                          isSelected
                            ? "apple-card shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_10px_24px_-4px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] border-[var(--glass-border)]"
                            : "border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                        }
                      `}
                    >
                      {/* Note Metadata */}
                      <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider mb-1 text-[var(--text-tertiary)] font-semibold">
                        <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                          <BookOpen className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="truncate text-[var(--text-secondary)]">
                            {space?.name || "Notebook"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasPhotos && (
                            <Camera className="w-3 h-3 text-[var(--text-secondary)] opacity-80" />
                          )}
                          {note.voiceMemo && (
                            <Mic className="w-3 h-3 text-[var(--text-secondary)] opacity-80" />
                          )}
                          {hasMarginalia && (
                            <span className="marginalia-stamp font-serif font-bold text-xs text-[var(--text-primary)]">
                              ¹
                            </span>
                          )}
                          <span className="opacity-60">
                            {formatTimeOnly(note.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Content Snippet */}
                      {note.content && (
                        <p className="font-content text-xs sm:text-[13px] leading-relaxed text-[var(--text-primary)] line-clamp-2">
                          {highlightMatch(note.content, query)}
                        </p>
                      )}

                      {/* Marginalia Snippet */}
                      {hasMarginalia && (
                        <div className="mt-1 pt-1 border-t border-[var(--glass-border)]/30 flex items-center gap-1.5 text-[11px] font-serif italic text-[var(--text-secondary)] truncate">
                          <span className="marginalia-stamp not-italic font-bold text-[10px]">
                            ¹
                          </span>
                          <span className="truncate">
                            {highlightMatch(
                              note.marginalia ||
                                note.marginaliaItems?.[0]?.content ||
                                "",
                              query,
                            )}
                          </span>
                          {note.quoteSource && (
                            <span className="opacity-50 text-[10px] font-sans not-italic">
                              · {note.quoteSource}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Info */}
            <div className="px-4 py-2 border-t border-[var(--glass-border)]/40 flex items-center justify-between text-[10px] text-[var(--text-tertiary)] font-sans relative z-10">
              <span>
                {filteredNotes.length}{" "}
                {filteredNotes.length === 1 ? "match" : "matches"}
              </span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-[var(--text-primary)]/8 text-[9px] font-mono">
                    ↑↓
                  </kbd>{" "}
                  Select
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-[var(--text-primary)]/8 text-[9px] font-mono flex items-center">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </kbd>{" "}
                  Open
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
