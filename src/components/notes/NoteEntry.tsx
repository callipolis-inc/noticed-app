import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FieldNote, TextHighlight, TextAlign, ImageFrameSize } from "@/types";
import { formatTimeOnly } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { TextHighlighter, toSuperscriptNumber } from "./TextHighlighter";
import {
  Play,
  Pause,
  MoreHorizontal,
  Pin,
  Trash2,
  Share2,
  Quote,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Pencil,
} from "lucide-react";

interface NoteEntryProps {
  note: FieldNote;
  isSharedSpace?: boolean;
  isHighlighted?: boolean;
  isReadingMode?: boolean;
  isFirstInGroup?: boolean;
  defaultTextAlign?: TextAlign;
  imageFrameSize?: ImageFrameSize;
  onPinToggle?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
  onEditNote?: (note: FieldNote) => void;
  onOpenPhotostrip?: (note: FieldNote) => void;
  onOpenQuickAnnotator?: (note: FieldNote) => void;
  onUpdateHighlights?: (noteId: string, highlights: TextHighlight[]) => void;
  onUpdateTextAlign?: (noteId: string, align: TextAlign) => void;
}

export function NoteEntry({
  note,
  isSharedSpace = false,
  isHighlighted = false,
  isReadingMode = false,
  defaultTextAlign = "left",
  imageFrameSize = "editorial",
  onPinToggle,
  onDeleteNote,
  onEditNote,
  onOpenPhotostrip,
  onOpenQuickAnnotator,
  onUpdateHighlights,
  onUpdateTextAlign,
}: NoteEntryProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isFootnotesExpanded, setIsFootnotesExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (note.voiceMemo?.audioUrl) {
      const audio = new Audio(note.voiceMemo.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
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

  const marginaliaList = useMemo(() => {
    if (note.marginaliaItems && note.marginaliaItems.length > 0) {
      return note.marginaliaItems;
    }
    if (note.marginalia) {
      return [
        {
          id: `${note.id}-m1`,
          content: note.marginalia,
          citation: note.quoteSource,
        },
      ];
    }
    return [];
  }, [note.id, note.marginalia, note.marginaliaItems, note.quoteSource]);

  const linkedHighlightNotes = useMemo(() => {
    return (note.highlights || []).filter((h) => Boolean(h.marginalia));
  }, [note.highlights]);

  // Footnotes that are NOT already anchored to a specific sentence inside note.content
  const paragraphEndFootnotes = useMemo(() => {
    return marginaliaList
      .map((item, idx) => ({ item, num: idx + 1 }))
      .filter(
        ({ item }) =>
          !item.targetSentence ||
          !note.content ||
          !note.content.includes(item.targetSentence),
      );
  }, [marginaliaList, note.content]);

  const hasMarginalia =
    marginaliaList.length > 0 || linkedHighlightNotes.length > 0;
  const hasPhotos = Boolean(note.photos && note.photos.length > 0);
  const formattedTime = formatTimeOnly(note.createdAt).toUpperCase();
  const authorLabel = note.author?.name
    ? note.author.name.toUpperCase()
    : "YOU";

  const effectiveAlign: TextAlign =
    note.textAlign || defaultTextAlign || "left";
  const textAlignClass =
    effectiveAlign === "center"
      ? "text-center"
      : effectiveAlign === "right"
        ? "text-right"
        : effectiveAlign === "justify"
          ? "text-justify hyphens-auto"
          : "text-left";

  const handleSaveHighlight = (newHl: TextHighlight) => {
    const updated = [...(note.highlights || []), newHl];
    onUpdateHighlights?.(note.id, updated);
    if (newHl.marginalia) {
      setIsFootnotesExpanded(true);
    }
  };

  const handleUpdateHighlight = (updatedHl: TextHighlight) => {
    const updated = (note.highlights || []).map((h) =>
      h.id === updatedHl.id ? updatedHl : h,
    );
    onUpdateHighlights?.(note.id, updated);
  };

  const handleDeleteHighlight = (id: string) => {
    const updated = (note.highlights || []).filter((h) => h.id !== id);
    onUpdateHighlights?.(note.id, updated);
  };

  // Right-Edge End-of-Paragraph Triggers (" and ...) pushed to the far right of the last line
  const renderInlineEndControls = (isStandalone = false) => {
    if (isReadingMode) return null;

    return (
      <span
        className={`relative ${
          isStandalone ? "ml-auto" : "float-right ml-3"
        } inline-flex items-center gap-1 align-baseline select-none transition-opacity ${
          showMenu ? "z-50 opacity-100" : "z-20"
        }`}
      >
        {/* Quick-Annotator (") trigger button */}
        {onOpenQuickAnnotator && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              onOpenQuickAnnotator(note);
            }}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[var(--text-primary)] opacity-40 hover:opacity-100 inner-pseudo-glass active:scale-90 transition-all cursor-pointer align-middle"
            title={
              hasMarginalia
                ? "Edit footnote / sidenote"
                : "Add footnote / sidenote"
            }
          >
            <Quote className="w-3 h-3 stroke-[1.85]" />
          </button>
        )}

        {/* More options (...) trigger button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic("light");
            setShowMenu((prev) => !prev);
          }}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[var(--text-primary)] inner-pseudo-glass active:scale-90 transition-all cursor-pointer align-middle ${
            showMenu
              ? "opacity-100 bg-[var(--text-primary)]/10"
              : "opacity-40 hover:opacity-100"
          }`}
          title="Note options"
        >
          <MoreHorizontal className="w-3.5 h-3.5 stroke-[1.85]" />
        </button>

        {/* Apple High-Density Liquid Drop-Up Context Menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              {/* Full-screen backdrop to close on outside click */}
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="
                  absolute right-0 bottom-full mb-2 z-50 min-w-48 py-1.5 rounded-2xl
                  bg-white/95 dark:bg-[#1a1a1e]/95 backdrop-blur-[36px] saturate-[190%]
                  border border-[var(--glass-border)]
                  shadow-[0_20px_45px_-8px_rgba(0,0,0,0.28),0_4px_12px_rgba(0,0,0,0.08)]
                  text-xs font-sans overflow-hidden text-left normal-case tracking-normal
                "
              >
                {/* Paragraph Alignment Segmented Control */}
                {onUpdateTextAlign && (
                  <div className="px-3 py-2 border-b border-[var(--glass-border)]/50 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                      Align
                    </span>
                    <div className="apple-segmented-track !p-0.5">
                      {(
                        [
                          { id: "left", icon: AlignLeft, label: "Left" },
                          { id: "center", icon: AlignCenter, label: "Center" },
                          { id: "right", icon: AlignRight, label: "Right" },
                          {
                            id: "justify",
                            icon: AlignJustify,
                            label: "Justify",
                          },
                        ] as {
                          id: TextAlign;
                          icon: typeof AlignLeft;
                          label: string;
                        }[]
                      ).map((opt) => {
                        const Icon = opt.icon;
                        const isActive = effectiveAlign === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic("light");
                              onUpdateTextAlign(note.id, opt.id);
                            }}
                            className={`p-1 rounded-full transition-all cursor-pointer ${
                              isActive
                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]"
                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            }`}
                            title={opt.label}
                          >
                            <Icon className="w-3 h-3 stroke-[2]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Edit Notice */}
                {onEditNote && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("light");
                      setShowMenu(false);
                      onEditNote(note);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                    <span className="font-medium">Edit Notice</span>
                  </button>
                )}

                {/* Quick Annotator in menu */}
                {onOpenQuickAnnotator && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("light");
                      setShowMenu(false);
                      onOpenQuickAnnotator(note);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Quote className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                    <span className="font-medium">
                      {hasMarginalia ? "Edit Footnotes" : "Add Footnote"}
                    </span>
                  </button>
                )}

                {/* Share Excerpt Card */}
                {onOpenPhotostrip && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("light");
                      setShowMenu(false);
                      onOpenPhotostrip(note);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                    <span className="font-medium">Share Excerpt</span>
                  </button>
                )}

                {/* Bookmark Toggle */}
                {onPinToggle && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("medium");
                      setShowMenu(false);
                      onPinToggle(note.id);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Pin className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                    <span className="font-medium">
                      {note.pinned ? "Unpin Bookmark" : "Bookmark Note"}
                    </span>
                  </button>
                )}

                {/* Delete Destructive Action */}
                {onDeleteNote && (
                  <>
                    <div className="h-px bg-[var(--glass-border)]/50 my-1" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic("heavy");
                        setShowMenu(false);
                        onDeleteNote(note.id);
                      }}
                      className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left hover:bg-rose-500/10 active:bg-rose-500/15 text-rose-500 transition-colors cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Delete Notice</span>
                    </button>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </span>
    );
  };

  // Pure borderless superscript numbers at the end of the paragraph
  const renderParagraphEndSuperscripts = () => {
    if (paragraphEndFootnotes.length === 0) return null;

    return (
      <span className="inline-flex items-baseline gap-0.5 ml-0.5 select-none">
        {paragraphEndFootnotes.map(({ item, num }) => (
          <button
            key={item.id || num}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              setIsFootnotesExpanded((prev) => !prev);
            }}
            className="inline font-serif font-bold text-[11.5px] leading-none text-[var(--text-primary)] opacity-75 hover:opacity-100 align-super cursor-pointer transition-opacity px-0.5"
            title={`Footnote ${num}: ${item.content}`}
          >
            {toSuperscriptNumber(num)}
          </button>
        ))}
      </span>
    );
  };

  return (
    <article
      id={`note-${note.id}`}
      className={`
        group relative transition-all duration-700
        ${showMenu ? "z-50" : "z-10"}
        ${isReadingMode ? "mb-10 sm:mb-14" : "mb-9 sm:mb-12"}
        ${
          isHighlighted
            ? "ring-2 ring-[var(--text-primary)]/40 bg-[var(--text-primary)]/[0.04] p-3.5 -m-3.5 rounded-3xl shadow-sm"
            : ""
        }
      `}
    >
      <div className="lg:grid lg:grid-cols-[1fr_220px] xl:grid-cols-[1fr_250px] lg:gap-8 lg:items-start">
        {/* Left Column: Primary Note Stream */}
        <div className="min-w-0 space-y-3">
          {/* 1. Photos */}
          {hasPhotos && (
            <div className="w-full">
              {note.photos!.length === 1 ? (
                /* Single Photo */
                <div
                  onClick={() => onOpenPhotostrip?.(note)}
                  className={`cursor-pointer aspect-[4/3] overflow-hidden bg-black/5 active:scale-[0.99] transition-all duration-300 border border-[var(--glass-border)]/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)] ${
                    imageFrameSize === "compact"
                      ? "w-full max-w-[210px] sm:max-w-[250px] rounded-2xl"
                      : imageFrameSize === "editorial"
                        ? "w-full max-w-[82%] sm:max-w-[74%] rounded-2xl sm:rounded-3xl"
                        : "w-full rounded-2xl sm:rounded-3xl"
                  } ${
                    imageFrameSize !== "full" && effectiveAlign === "center"
                      ? "mx-auto"
                      : imageFrameSize !== "full" && effectiveAlign === "right"
                        ? "ml-auto"
                        : ""
                  }`}
                >
                  <img
                    src={note.photos![0]}
                    alt="Captured moment"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                /* Multi Photos: Horizontal strip with snap */
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 snap-x">
                  {note.photos!.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => onOpenPhotostrip?.(note)}
                      className={`cursor-pointer shrink-0 aspect-[4/3] overflow-hidden bg-black/5 active:scale-[0.99] transition-all duration-300 snap-start border border-[var(--glass-border)]/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)] ${
                        imageFrameSize === "compact"
                          ? "w-[46%] sm:w-[36%] rounded-2xl"
                          : imageFrameSize === "editorial"
                            ? "w-[62%] sm:w-[48%] rounded-2xl sm:rounded-3xl"
                            : "w-[76%] sm:w-[60%] rounded-2xl sm:rounded-3xl"
                      }`}
                    >
                      <img
                        src={photoUrl}
                        alt={`Captured moment ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Caption-Anchor Flow */}
          {note.content && (
            <div
              style={{
                fontSize: isReadingMode
                  ? "calc(var(--note-font-size, 15.5px) + 1px)"
                  : "var(--note-font-size, 15.5px)",
              }}
              className={`font-content leading-[1.78] text-[var(--text-primary)] whitespace-pre-wrap selection:bg-[var(--text-primary)] selection:text-[var(--bg-base)] after:content-[''] after:table after:clear-both ${textAlignClass}`}
            >
              {note.title && (
                <h3 className="font-serif font-bold text-[17px] sm:text-[18px] text-[var(--text-primary)] tracking-tight leading-snug pb-1">
                  {note.title}
                </h3>
              )}
              <span className="text-[11px] sm:text-[11.5px] font-sans font-semibold tracking-wider opacity-45 uppercase select-none mr-2 inline-block">
                {note.pinned && (
                  <span
                    className="inline-flex items-center text-[var(--text-primary)] opacity-70 mr-1.5"
                    title="Pinned notice"
                  >
                    <Pin className="w-2.5 h-2.5 fill-current rotate-45 inline" />
                  </span>
                )}
                {formattedTime}
                {isSharedSpace && (
                  <span className="opacity-90 font-medium tracking-wide">
                    {" "}
                    · {authorLabel}
                  </span>
                )}{" "}
                —
              </span>
              <TextHighlighter
                content={note.content}
                highlights={note.highlights}
                marginaliaItems={marginaliaList}
                isReadingMode={isReadingMode}
                className="inline"
                onSaveHighlight={handleSaveHighlight}
                onUpdateHighlight={handleUpdateHighlight}
                onDeleteHighlight={handleDeleteHighlight}
                onToggleFootnotes={() =>
                  setIsFootnotesExpanded((prev) => !prev)
                }
              />
              {renderParagraphEndSuperscripts()}
              {renderInlineEndControls(false)}
            </div>
          )}

          {/* Standalone timestamp if there is no text content */}
          {!note.content && (
            <div className="text-[11px] font-sans font-semibold tracking-wider text-[var(--text-primary)] uppercase select-none flex items-center justify-between w-full gap-2">
              <span className="opacity-45">
                {note.pinned && (
                  <span
                    className="inline-flex items-center text-[var(--text-primary)] opacity-70 mr-1.5"
                    title="Pinned notice"
                  >
                    <Pin className="w-2.5 h-2.5 fill-current rotate-45 inline" />
                  </span>
                )}
                {formattedTime}
                {isSharedSpace && (
                  <span className="opacity-90 font-medium tracking-wide">
                    {" "}
                    · {authorLabel}
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-1 ml-auto">
                {renderParagraphEndSuperscripts()}
                {renderInlineEndControls(true)}
              </span>
            </div>
          )}

          {/* 3. Audio Memo: Apple Dynamic Island Audio Capsule */}
          {note.voiceMemo && (
            <div className="inline-flex items-center gap-2.5 py-1 px-3 rounded-full dynamic-island-shell text-xs shadow-[0_4px_12px_rgba(0,0,0,0.08)] mt-1 border border-[var(--glass-border)]">
              <button
                type="button"
                onClick={toggleAudio}
                className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] flex items-center justify-center transition-transform active:scale-90 shadow-xs cursor-pointer"
                title={isPlayingAudio ? "Pause" : "Play"}
              >
                {isPlayingAudio ? (
                  <Pause className="w-2.5 h-2.5" />
                ) : (
                  <Play className="w-2.5 h-2.5 ml-0.5" />
                )}
              </button>

              {/* Minimal Waveform */}
              <div className="flex items-center gap-0.5 h-3">
                {[40, 75, 55, 90, 60, 30, 80, 45, 70, 50, 85, 40].map(
                  (h, i) => (
                    <span
                      key={i}
                      className={`w-0.5 rounded-full transition-all duration-300 ${
                        isPlayingAudio
                          ? "bg-[var(--text-primary)] animate-pulse"
                          : "bg-[var(--text-tertiary)] opacity-60"
                      }`}
                      style={{ height: `${Math.max(3, h * 0.15)}px` }}
                    />
                  ),
                )}
              </div>

              <span className="font-mono text-[10.5px] font-medium text-[var(--text-secondary)]">
                0:{note.voiceMemo.durationSeconds.toString().padStart(2, "0")}
              </span>
            </div>
          )}

          {/* 4. Penguin Classics Borderless Footnote Apparatus */}
          <AnimatePresence>
            {isFootnotesExpanded && hasMarginalia && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden pt-2.5"
              >
                {/* Penguin Classics Horizontal Hairline Divider */}
                <div className="w-10 h-px bg-[var(--text-primary)]/25 mb-2" />

                <div className="space-y-1.5 text-left">
                  {marginaliaList.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      onClick={() => {
                        if (!isReadingMode && onOpenQuickAnnotator) {
                          triggerHaptic("light");
                          onOpenQuickAnnotator(note);
                        }
                      }}
                      className={`text-[13px] leading-relaxed font-serif text-[var(--text-secondary)] ${
                        !isReadingMode
                          ? "cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                          : ""
                      }`}
                      title={
                        !isReadingMode ? "Tap to edit footnote" : undefined
                      }
                    >
                      <span className="font-serif font-bold text-[12px] text-[var(--text-primary)] mr-1.5 select-none">
                        {toSuperscriptNumber(idx + 1)}
                      </span>
                      <span className="italic">{m.content}</span>
                      {m.citation && (
                        <span className="not-italic text-[11px] font-sans text-[var(--text-tertiary)] ml-1.5">
                          — {m.citation}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Linked Highlight Footnotes */}
                  {linkedHighlightNotes.map((hl, hIdx) => {
                    const fnNum = marginaliaList.length + hIdx + 1;
                    return (
                      <div
                        key={hl.id}
                        className="text-[13px] leading-relaxed font-serif text-[var(--text-secondary)]"
                      >
                        <span className="font-serif font-bold text-[12px] text-[var(--text-primary)] mr-1.5 select-none">
                          {toSuperscriptNumber(fnNum)}
                        </span>
                        <span className="italic">{hl.marginalia}</span>
                        <span className="not-italic text-[11px] font-sans text-[var(--text-tertiary)] ml-1.5">
                          (“
                          {hl.selectedText.length > 36
                            ? `${hl.selectedText.slice(0, 36)}…`
                            : hl.selectedText}
                          ”)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Desktop Margin Footnotes (Gutter) */}
        <aside className="hidden lg:block pt-1 select-text">
          {hasMarginalia ? (
            <div className="pl-2 space-y-3">
              {marginaliaList.map((m, idx) => (
                <div
                  key={m.id || idx}
                  onClick={() => {
                    if (!isReadingMode && onOpenQuickAnnotator) {
                      triggerHaptic("light");
                      onOpenQuickAnnotator(note);
                    }
                  }}
                  className={`
                    group/margin text-xs transition-colors
                    ${
                      !isReadingMode
                        ? "cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        : "select-text text-[var(--text-secondary)]"
                    }
                  `}
                  title={!isReadingMode ? "Click to edit footnote" : undefined}
                >
                  <p className="font-serif italic text-[13px] leading-relaxed">
                    <span className="not-italic font-serif font-bold text-[12px] text-[var(--text-primary)] mr-1 select-none">
                      {toSuperscriptNumber(idx + 1)}
                    </span>
                    {m.content}
                    {m.citation && (
                      <span className="block not-italic text-[10.5px] font-sans text-[var(--text-tertiary)] mt-0.5">
                        — {m.citation}
                      </span>
                    )}
                  </p>
                </div>
              ))}

              {/* Linked Highlight Marginalia in Desktop Gutter */}
              {linkedHighlightNotes.map((hl, hIdx) => {
                const fnNum = marginaliaList.length + hIdx + 1;
                return (
                  <div
                    key={hl.id}
                    className="text-xs select-text text-[var(--text-secondary)]"
                  >
                    <p className="font-serif italic text-[13px] leading-relaxed">
                      <span className="not-italic font-serif font-bold text-[12px] text-[var(--text-primary)] mr-1 select-none">
                        {toSuperscriptNumber(fnNum)}
                      </span>
                      {hl.marginalia}
                    </p>
                  </div>
                );
              })}

              {/* Add another footnote button on desktop hover */}
              {!isReadingMode && onOpenQuickAnnotator && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onOpenQuickAnnotator(note);
                  }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-sans text-[var(--text-tertiary)] hover:text-[var(--text-primary)] pt-0.5 cursor-pointer"
                  title="Add another footnote"
                >
                  <Plus className="w-3 h-3 stroke-[2]" />
                  <span className="italic">footnote</span>
                </button>
              )}
            </div>
          ) : /* Subtle trigger to add initial footnote on desktop hover */
          !isReadingMode && onOpenQuickAnnotator ? (
            <div className="h-4 group/addmargin flex items-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onOpenQuickAnnotator(note);
                }}
                className="opacity-0 group-hover/addmargin:opacity-60 hover:!opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-sans text-[var(--text-tertiary)] hover:text-[var(--text-primary)] pl-2 cursor-pointer"
                title="Add footnote"
              >
                <Plus className="w-3 h-3 stroke-[2]" />
                <span className="italic">footnote</span>
              </button>
            </div>
          ) : (
            <div className="h-4" />
          )}
        </aside>
      </div>
    </article>
  );
}
