import { useState, useMemo, useRef, memo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FieldNote,
  TextHighlight,
  HighlightStyle,
  TextAlign,
  ImageFrameSize,
  ImagePosition,
  LineSpacing,
  PhotoMeta,
} from "@/types";
import { formatTimeOnly, generateId } from "@/lib/utils";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { AppLanguage } from "@/lib/i18n";
import { TextHighlighter, toSuperscriptNumber } from "./TextHighlighter";
import { InlineVideoPlayer } from "./InlineVideoPlayer";
import { TactileAudioPlayer } from "./TactileAudioPlayer";
import {
  MoreHorizontal,
  Pin,
  MapPin,
  Trash2,
  Share2,
  Quote,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Pencil,
  Copy,
  Archive,
  GitFork,
  X,
} from "lucide-react";

interface NoteEntryProps {
  note: FieldNote;
  isSharedSpace?: boolean;
  isHighlighted?: boolean;
  isReadingMode?: boolean;
  isReadOnly?: boolean;
  isFirstInGroup?: boolean;
  defaultTextAlign?: TextAlign;
  defaultImagePosition?: ImagePosition;
  defaultLineSpacing?: LineSpacing;
  imageFrameSize?: ImageFrameSize;
  isMenuOpen?: boolean;
  onToggleMenu?: (noteId: string, open: boolean) => void;
  onPinToggle?: (id: string) => void;
  onArchiveToggle?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
  onEditNote?: (note: FieldNote) => void;
  onOpenPhotostrip?: (note: FieldNote) => void;
  onOpenQuickAnnotator?: (note: FieldNote) => void;
  currentUserId?: string | null;
  currentUserName?: string;
  currentLanguage?: AppLanguage;
  onUpdateHighlights?: (noteId: string, highlights: TextHighlight[]) => void;
  onUpdateTextAlign?: (noteId: string, align: TextAlign) => void;
}

export const NoteEntry = memo(function NoteEntry({
  note,
  isSharedSpace = false,
  isHighlighted = false,
  isReadingMode = false,
  isReadOnly = false,
  currentUserId = null,
  currentUserName = "Author",
  currentLanguage,
  defaultTextAlign = "left",
  defaultImagePosition = "bottom",
  defaultLineSpacing = "editorial",
  imageFrameSize = "editorial",
  isMenuOpen = false,
  onToggleMenu,
  onPinToggle,
  onArchiveToggle,
  onDeleteNote,
  onEditNote,
  onOpenPhotostrip,
  onOpenQuickAnnotator,
  onUpdateHighlights,
  onUpdateTextAlign,
}: NoteEntryProps) {
  const showMenu = Boolean(isMenuOpen);
  const isId = currentLanguage === "id";
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    placement: "up" | "down";
  }>({ right: 16, top: 120, placement: "down" });
  const [isFootnotesExpanded, setIsFootnotesExpanded] = useState(false);

  const updateMenuPosition = useCallback(() => {
    if (!menuButtonRef.current || typeof window === "undefined") return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rightOffset = Math.max(12, Math.min(vw - 248, vw - rect.right));
    const spaceBelow = vh - rect.bottom;
    const placeUp = spaceBelow < 340 && rect.top > 300;

    if (placeUp) {
      setMenuCoords({
        bottom: Math.max(12, vh - rect.top + 8),
        right: rightOffset,
        placement: "up",
      });
    } else {
      setMenuCoords({
        top: Math.min(vh - 220, rect.bottom + 8),
        right: rightOffset,
        placement: "down",
      });
    }
  }, []);

  useEffect(() => {
    if (showMenu) {
      updateMenuPosition();
    }
  }, [showMenu, updateMenuPosition]);

  const toggleMenu = useCallback(
    (open: boolean) => {
      if (open) {
        updateMenuPosition();
      }
      onToggleMenu?.(note.id, open);
    },
    [onToggleMenu, note.id, updateMenuPosition],
  );

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
  const hasVideos = Boolean(note.videos && note.videos.length > 0);
  const formattedTime = formatTimeOnly(
    note.createdAt,
    currentLanguage,
  ).toUpperCase();
  const isCurrentUserAuthor = Boolean(
    note.author?.userId && currentUserId
      ? note.author.userId === currentUserId
      : !note.author?.name || note.author?.name === currentUserName,
  );
  const authorLabel = isCurrentUserAuthor
    ? isId
      ? "ANDA"
      : "YOU"
    : (note.author?.name || (isId ? "TEMAN" : "PARTNER")).toUpperCase();
  const authorAvatar = !isCurrentUserAuthor
    ? note.author?.avatarUrl || note.author?.avatar
    : null;

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

  // Quick highlight from the "..." menu (applies to existing highlights or full note passage)
  const handleQuickHighlightFromMenu = (style: HighlightStyle) => {
    if (!note.content || !onUpdateHighlights) return;
    triggerSuccessHaptic();
    const existing = note.highlights || [];
    if (existing.length > 0) {
      // Update style of existing highlights on this note
      const updated = existing.map((h) => ({ ...h, style }));
      onUpdateHighlights(note.id, updated);
    } else {
      // Highlight the full note text
      const trimmed = note.content.trim();
      if (!trimmed) return;
      const startIdx = note.content.indexOf(trimmed);
      const newHl: TextHighlight = {
        id: generateId(),
        startIndex: Math.max(0, startIdx),
        endIndex: Math.max(0, startIdx) + trimmed.length,
        selectedText: trimmed,
        style,
        createdAt: new Date().toISOString(),
      };
      onUpdateHighlights(note.id, [newHl]);
    }
    toggleMenu(false);
  };

  const handleClearAllHighlightsFromMenu = () => {
    if (!onUpdateHighlights) return;
    triggerHaptic("medium");
    onUpdateHighlights(note.id, []);
    toggleMenu(false);
  };

  // Action triggers (" and ...) positioned cleanly at bottom right of the note
  const renderInlineEndControls = () => {
    if (isReadingMode) return null;

    return (
      <span
        className={`relative inline-flex items-center gap-2 align-middle select-none transition-opacity ${
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
            aria-label={
              hasMarginalia
                ? "Edit footnote or sidenote"
                : "Add footnote or sidenote"
            }
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-primary)] opacity-65 hover:opacity-100 inner-pseudo-glass active:scale-90 transition-all cursor-pointer align-middle shrink-0 relative before:absolute before:-inset-2 before:content-[''] touch-manipulation"
            title={
              hasMarginalia
                ? "Edit footnote / sidenote"
                : "Add footnote / sidenote"
            }
          >
            <Quote className="w-3.5 h-3.5 stroke-[1.85]" />
          </button>
        )}

        {/* More options (...) trigger button */}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic("light");
            toggleMenu(!showMenu);
          }}
          aria-label="More notice options"
          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-primary)] inner-pseudo-glass active:scale-90 transition-all cursor-pointer align-middle shrink-0 relative before:absolute before:-inset-2 before:content-[''] touch-manipulation ${
            showMenu
              ? "opacity-100 bg-[var(--text-primary)]/15"
              : "opacity-65 hover:opacity-100"
          }`}
          title="Note options"
        >
          <MoreHorizontal className="w-4 h-4 stroke-[1.95]" />
        </button>

        {/* Portaled High-Density Context Menu (Immune to content-visibility & transform stacking contexts) */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {showMenu && (
                <div className="fixed inset-0 z-[9990] pointer-events-auto">
                  {/* Full-screen backdrop to close on outside click/tap */}
                  <div
                    className="fixed inset-0 z-[9990] bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMenu(false);
                    }}
                  />

                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.94,
                      y: menuCoords.placement === "down" ? -6 : 6,
                    }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.94,
                      y: menuCoords.placement === "down" ? -6 : 6,
                    }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      top:
                        menuCoords.top !== undefined
                          ? `${menuCoords.top}px`
                          : undefined,
                      bottom:
                        menuCoords.bottom !== undefined
                          ? `${menuCoords.bottom}px`
                          : undefined,
                      right: `${menuCoords.right}px`,
                    }}
                    className="
                      fixed z-[9995] min-w-[232px] py-1.5 rounded-2xl
                      bg-[var(--bg-elevated)]/98 backdrop-blur-[36px] saturate-[190%]
                      border border-[var(--glass-border)]
                      shadow-[0_20px_45px_-8px_rgba(0,0,0,0.32),0_4px_12px_rgba(0,0,0,0.12)]
                      text-xs font-sans overflow-hidden text-left normal-case tracking-normal
                      max-h-[min(420px,calc(100dvh-100px))] overflow-y-auto no-scrollbar select-none
                    "
                  >
                    {/* Paragraph Alignment Segmented Control */}
                    {!isReadOnly && onUpdateTextAlign && (
                      <div className="px-3.5 py-2 border-b border-[var(--glass-border)]/50 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                          {isId ? "Perataan" : "Align"}
                        </span>
                        <div className="apple-segmented-track !p-0.5">
                          {(
                            [
                              { id: "left", icon: AlignLeft, label: "Left" },
                              {
                                id: "center",
                                icon: AlignCenter,
                                label: "Center",
                              },
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
                                aria-label={`Align ${opt.label}`}
                                className={`relative p-1.5 rounded-full transition-all cursor-pointer touch-manipulation ${
                                  isActive
                                    ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                }`}
                                title={opt.label}
                              >
                                <Icon className="w-3.5 h-3.5 stroke-[2]" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quick Highlight Bar (Pencil / Sepia / Cobalt) directly accessible from ... menu */}
                    {!isReadOnly && note.content && onUpdateHighlights && (
                      <div className="px-3.5 py-2 border-b border-[var(--glass-border)]/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                            {isId ? "Stabilo Cepat" : "Quick Highlight"}
                          </span>
                          {note.highlights && note.highlights.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearAllHighlightsFromMenu();
                              }}
                              className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-0.5 cursor-pointer touch-manipulation"
                              title={
                                isId ? "Hapus stabilo" : "Clear highlights"
                              }
                            >
                              <X className="w-2.5 h-2.5" />
                              <span>{isId ? "Reset" : "Clear"}</span>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              {
                                id: "graphite" as HighlightStyle,
                                label: isId ? "Pensil" : "Pencil",
                                color: "#78716c",
                              },
                              {
                                id: "sepia" as HighlightStyle,
                                label: "Sepia",
                                color: "#a86432",
                              },
                              {
                                id: "cobalt" as HighlightStyle,
                                label: isId ? "Kobalt" : "Cobalt",
                                color: "#3b6291",
                              },
                            ]
                          ).map((sw) => {
                            const isCurrentStyle =
                              note.highlights &&
                              note.highlights.length > 0 &&
                              note.highlights.every((h) => h.style === sw.id);
                            return (
                              <button
                                key={sw.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickHighlightFromMenu(sw.id);
                                }}
                                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer touch-manipulation ${
                                  isCurrentStyle
                                    ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                                    : "inner-pseudo-glass text-[var(--text-primary)]"
                                }`}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: sw.color }}
                                />
                                <span>{sw.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Edit Notice */}
                    {!isReadOnly && onEditNote && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic("light");
                          toggleMenu(false);
                          onEditNote(note);
                        }}
                        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:bg-[var(--text-primary)]/5 active:bg-[var(--text-primary)]/10 text-[var(--text-primary)] transition-colors cursor-pointer touch-manipulation"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                        <span className="font-medium">
                          {isId ? "Edit Catatan" : "Edit Notice"}
                        </span>
                      </button>
                    )}

                    {/* Quick Annotator in menu */}
                    {!isReadOnly && onOpenQuickAnnotator && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic("light");
                          toggleMenu(false);
                          onOpenQuickAnnotator(note);
                        }}
                        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:bg-[var(--text-primary)]/5 active:bg-[var(--text-primary)]/10 text-[var(--text-primary)] transition-colors cursor-pointer touch-manipulation"
                      >
                        <Quote className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                        <span className="font-medium">
                          {hasMarginalia
                            ? isId
                              ? "Edit Catatan Kaki"
                              : "Edit Footnotes"
                            : isId
                              ? "Tambah Catatan Kaki"
                              : "Add Footnote"}
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
                          toggleMenu(false);
                          onOpenPhotostrip(note);
                        }}
                        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:bg-[var(--text-primary)]/5 active:bg-[var(--text-primary)]/10 text-[var(--text-primary)] transition-colors cursor-pointer touch-manipulation"
                      >
                        <Share2 className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                        <span className="font-medium">
                          {isId ? "Bagikan Kutipan" : "Share Excerpt"}
                        </span>
                      </button>
                    )}

                    {/* Copy Text Action */}
                    {note.content && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic("light");
                          toggleMenu(false);
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(
                              `${note.title ? `${note.title}\n\n` : ""}${note.content}\n\n— noticed`,
                            );
                          }
                        }}
                        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:bg-[var(--text-primary)]/5 active:bg-[var(--text-primary)]/10 text-[var(--text-primary)] transition-colors cursor-pointer touch-manipulation"
                      >
                        <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                        <span className="font-medium">
                          {isId ? "Salin Teks" : "Copy Text"}
                        </span>
                      </button>
                    )}

                    {/* Bookmark Toggle */}
                    {!isReadOnly && onPinToggle && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic("medium");
                          toggleMenu(false);
                          onPinToggle(note.id);
                        }}
                        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:bg-[var(--text-primary)]/5 active:bg-[var(--text-primary)]/10 text-[var(--text-primary)] transition-colors cursor-pointer touch-manipulation"
                      >
                        <Pin className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                        <span className="font-medium">
                          {note.pinned
                            ? isId
                              ? "Lepas Sematan"
                              : "Unpin Bookmark"
                            : isId
                              ? "Sematkan Catatan"
                              : "Bookmark Note"}
                        </span>
                      </button>
                    )}

                    {/* Archive Toggle */}
                    {!isReadOnly && onArchiveToggle && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic("medium");
                          toggleMenu(false);
                          onArchiveToggle(note.id);
                        }}
                        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:bg-[var(--text-primary)]/5 active:bg-[var(--text-primary)]/10 text-[var(--text-primary)] transition-colors cursor-pointer touch-manipulation"
                      >
                        <Archive className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                        <span className="font-medium">
                          {note.archived
                            ? isId
                              ? "Kembalikan dari Arsip"
                              : "Unarchive Note"
                            : isId
                              ? "Arsipkan Catatan"
                              : "Archive Note"}
                        </span>
                      </button>
                    )}

                    {/* Delete Destructive Action */}
                    {!isReadOnly && onDeleteNote && (
                      <>
                        <div className="h-px bg-[var(--glass-border)]/50 my-1" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic("heavy");
                            toggleMenu(false);
                            onDeleteNote(note.id);
                          }}
                          style={{ color: "#9e3b33" }}
                          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:opacity-85 active:opacity-75 transition-opacity cursor-pointer font-medium touch-manipulation"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isId ? "Hapus Catatan" : "Delete Notice"}
                          </span>
                        </button>
                      </>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>,
            document.body,
          )}
      </span>
    );
  };

  // Pure borderless superscript numbers at the end of the paragraph
  const renderParagraphEndSuperscripts = () => {
    if (paragraphEndFootnotes.length === 0) return null;

    return (
      <span className="inline-flex items-baseline gap-0.5 ml-0.5 select-none align-super">
        {paragraphEndFootnotes.map(({ item, num }) => (
          <button
            key={item.id || num}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              setIsFootnotesExpanded((prev) => !prev);
            }}
            aria-label={`Footnote ${num}: ${item.content}`}
            className="inline-flex items-center justify-center min-w-[28px] min-h-[28px] -my-1 p-0.5 font-serif font-bold text-[13px] leading-none text-[var(--text-primary)] opacity-85 hover:opacity-100 active:scale-125 cursor-pointer transition-all rounded-full hover:bg-[var(--text-primary)]/10 touch-manipulation"
            title={`Footnote ${num}: ${item.content}`}
          >
            {toSuperscriptNumber(num)}
          </button>
        ))}
      </span>
    );
  };

  const effectiveImagePosition =
    defaultImagePosition || note.imagePosition || "bottom";
  const effectiveLineSpacing = note.lineSpacing || defaultLineSpacing;
  const leadingClass =
    effectiveLineSpacing === "compact"
      ? "leading-[1.5]"
      : effectiveLineSpacing === "spacious"
        ? "leading-[2.0]"
        : "leading-[1.78]";

  const getAspectClass = (meta?: PhotoMeta) => {
    if (meta?.aspectRatio === "original") return "aspect-auto max-h-[520px]";
    if (meta?.aspectRatio === "1/1") return "aspect-square";
    if (meta?.aspectRatio === "16/9") return "aspect-video";
    return "aspect-[4/3]";
  };

  return (
    <article
      id={`note-${note.id}`}
      className={`
        group relative transition-all duration-700
        ${showMenu ? "z-50" : "z-10 cv-auto"}
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
          {/* Top Media if imagePosition is top */}
          {effectiveImagePosition === "top" && (
            <div className="w-full space-y-3">
              {/* Photos */}
              {hasPhotos && (
                <div className="w-full">
                  {note.photos!.length === 1 ? (
                    /* Single Photo */
                    (() => {
                      const meta = note.photosMeta?.[0];
                      const filterClass = meta?.filter
                        ? `film-filter-${meta.filter}`
                        : "";
                      const isPolaroid = meta?.frameMode === "polaroid";
                      const isArchival = meta?.frameMode === "archival";
                      const aspectClass = getAspectClass(meta);

                      const sizingClass =
                        imageFrameSize === "compact"
                          ? "w-full max-w-[210px] sm:max-w-[250px]"
                          : imageFrameSize === "editorial"
                            ? "w-full max-w-[82%] sm:max-w-[74%]"
                            : "w-full";

                      const alignClass =
                        imageFrameSize !== "full" && effectiveAlign === "center"
                          ? "mx-auto"
                          : imageFrameSize !== "full" &&
                              effectiveAlign === "right"
                            ? "ml-auto"
                            : "";

                      if (isPolaroid) {
                        return (
                          <div
                            onClick={() => onOpenPhotostrip?.(note)}
                            className={`cursor-pointer polaroid-frame-card p-3 sm:p-3.5 pb-4 sm:pb-5 rounded-2xl sm:rounded-3xl active:scale-[0.99] transition-all duration-300 ${sizingClass} ${alignClass}`}
                          >
                            <div
                              className={`relative ${aspectClass} rounded-xl overflow-hidden bg-black/5`}
                            >
                              <img
                                src={note.photos![0]}
                                alt="Captured moment"
                                className={`w-full h-full object-cover ${filterClass}`}
                                loading="lazy"
                                decoding="async"
                              />
                              {meta?.hasGrain && (
                                <div className="film-grain-overlay" />
                              )}
                            </div>

                            {/* Polaroid Typewriter Caption Bottom Margin */}
                            <div className="pt-2.5 sm:pt-3 px-1 flex items-baseline justify-between gap-2 border-t border-[var(--text-primary)]/10 mt-2">
                              <p className="font-typewriter text-[11px] sm:text-[12px] tracking-tight leading-snug truncate flex-1 opacity-90 text-[var(--text-primary)]">
                                {meta?.caption?.trim() || "—"}
                              </p>
                              <span className="font-typewriter text-[9px] sm:text-[10px] uppercase tracking-wider opacity-60 shrink-0 text-[var(--text-secondary)]">
                                {meta?.filter && meta.filter !== "natural"
                                  ? meta.filter.toUpperCase()
                                  : ""}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (isArchival) {
                        return (
                          <div
                            onClick={() => onOpenPhotostrip?.(note)}
                            className={`cursor-pointer active:scale-[0.99] transition-all duration-300 ${sizingClass} ${alignClass}`}
                          >
                            <div className="p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]">
                              <div
                                className={`relative ${aspectClass} overflow-hidden rounded-xl bg-black/5`}
                              >
                                <img
                                  src={note.photos![0]}
                                  alt="Captured moment"
                                  className={`w-full h-full object-cover ${filterClass}`}
                                  loading="lazy"
                                  decoding="async"
                                />
                                {meta?.hasGrain && (
                                  <div className="film-grain-overlay" />
                                )}
                              </div>
                              {meta?.caption?.trim() && (
                                <p className="font-serif italic text-center text-xs text-[var(--text-secondary)] pt-2 pb-0.5 px-2">
                                  {meta.caption}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          onClick={() => onOpenPhotostrip?.(note)}
                          className={`cursor-pointer active:scale-[0.99] transition-all duration-300 ${sizingClass} ${alignClass}`}
                        >
                          <div
                            className={`relative ${aspectClass} overflow-hidden bg-black/5 rounded-2xl sm:rounded-3xl border border-[var(--glass-border)]/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]`}
                          >
                            <img
                              src={note.photos![0]}
                              alt="Captured moment"
                              className={`w-full h-full object-cover ${filterClass}`}
                              loading="lazy"
                              decoding="async"
                            />
                            {meta?.hasGrain && (
                              <div className="film-grain-overlay" />
                            )}
                          </div>
                          {meta?.caption?.trim() && (
                            <p className="font-typewriter text-[11px] sm:text-[12px] text-[var(--text-secondary)] opacity-85 px-1 pt-1.5 truncate">
                              {meta.caption}
                            </p>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* Multi Photos: Horizontal strip with snap */
                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 snap-x">
                      {note.photos!.map((photoUrl, idx) => {
                        const meta = note.photosMeta?.[idx];
                        const filterClass = meta?.filter
                          ? `film-filter-${meta.filter}`
                          : "";
                        const isPolaroid = meta?.frameMode === "polaroid";
                        const isArchival = meta?.frameMode === "archival";
                        const aspectClass = getAspectClass(meta);

                        const sizingClass =
                          imageFrameSize === "compact"
                            ? "w-[46%] sm:w-[36%]"
                            : imageFrameSize === "editorial"
                              ? "w-[62%] sm:w-[48%]"
                              : "w-[76%] sm:w-[60%]";

                        if (isPolaroid) {
                          return (
                            <div
                              key={idx}
                              onClick={() => onOpenPhotostrip?.(note)}
                              className={`cursor-pointer shrink-0 snap-start polaroid-frame-card p-2.5 pb-3.5 sm:p-3 sm:pb-4 rounded-2xl active:scale-[0.99] transition-all duration-300 ${sizingClass}`}
                            >
                              <div
                                className={`relative ${aspectClass} rounded-lg overflow-hidden bg-black/5`}
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Captured moment ${idx + 1}`}
                                  className={`w-full h-full object-cover ${filterClass}`}
                                  loading="lazy"
                                  decoding="async"
                                />
                                {meta?.hasGrain && (
                                  <div className="film-grain-overlay" />
                                )}
                              </div>
                              {/* Polaroid Bottom Margin */}
                              <div className="pt-2 px-0.5 flex items-baseline justify-between gap-1.5 border-t border-[var(--text-primary)]/10 mt-1.5">
                                <p className="font-typewriter text-[10px] sm:text-[11px] tracking-tight leading-snug truncate flex-1 opacity-90 text-[var(--text-primary)]">
                                  {meta?.caption?.trim() || `Plate #${idx + 1}`}
                                </p>
                                <span className="font-typewriter text-[8.5px] uppercase tracking-wider opacity-60 shrink-0 text-[var(--text-secondary)]">
                                  {meta?.filter && meta.filter !== "natural"
                                    ? meta.filter.toUpperCase()
                                    : ""}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        if (isArchival) {
                          return (
                            <div
                              key={idx}
                              onClick={() => onOpenPhotostrip?.(note)}
                              className={`cursor-pointer shrink-0 snap-start active:scale-[0.99] transition-all duration-300 ${sizingClass}`}
                            >
                              <div className="p-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] shadow-md">
                                <div
                                  className={`relative ${aspectClass} overflow-hidden rounded-xl bg-black/5`}
                                >
                                  <img
                                    src={photoUrl}
                                    alt={`Captured moment ${idx + 1}`}
                                    className={`w-full h-full object-cover ${filterClass}`}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                  {meta?.hasGrain && (
                                    <div className="film-grain-overlay" />
                                  )}
                                </div>
                                {meta?.caption?.trim() && (
                                  <p className="font-serif italic text-center text-[10.5px] text-[var(--text-secondary)] pt-1.5 truncate">
                                    {meta.caption}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => onOpenPhotostrip?.(note)}
                            className={`cursor-pointer shrink-0 snap-start active:scale-[0.99] transition-all duration-300 space-y-1 ${sizingClass}`}
                          >
                            <div
                              className={`relative ${aspectClass} overflow-hidden bg-black/5 rounded-2xl sm:rounded-3xl border border-[var(--glass-border)]/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]`}
                            >
                              <img
                                src={photoUrl}
                                alt={`Captured moment ${idx + 1}`}
                                className={`w-full h-full object-cover ${filterClass}`}
                                loading="lazy"
                                decoding="async"
                              />
                              {meta?.hasGrain && (
                                <div className="film-grain-overlay" />
                              )}
                            </div>
                            {meta?.caption?.trim() && (
                              <p className="font-typewriter text-[10px] sm:text-[11px] text-[var(--text-secondary)] opacity-85 px-1 truncate">
                                {meta.caption}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Inline Videos */}
              {hasVideos && (
                <div className="w-full space-y-2.5">
                  {note.videos!.map((videoUrl, idx) => (
                    <div
                      key={idx}
                      className={`
                        ${
                          imageFrameSize === "compact"
                            ? "w-full max-w-[280px] sm:max-w-[320px]"
                            : imageFrameSize === "editorial"
                              ? "w-full max-w-[92%] sm:max-w-[84%]"
                              : "w-full"
                        }
                        ${
                          imageFrameSize !== "full" &&
                          effectiveAlign === "center"
                            ? "mx-auto"
                            : imageFrameSize !== "full" &&
                                effectiveAlign === "right"
                              ? "ml-auto"
                              : ""
                        }
                      `}
                    >
                      <InlineVideoPlayer src={videoUrl} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 1. Note Header & Text Content Flow */}
          {(note.content || note.title) && (
            <div
              style={{
                fontSize: isReadingMode
                  ? "calc(var(--note-font-size, 15.5px) + 1px)"
                  : "var(--note-font-size, 15.5px)",
              }}
              data-font={note.fontChoice || "editorial"}
              data-selectable="true"
              className={`font-content select-text ${leadingClass} text-[var(--text-primary)] whitespace-pre-wrap selection:bg-[var(--text-primary)] selection:text-[var(--bg-base)] after:content-[''] after:table after:clear-both ${textAlignClass}`}
            >
              {note.title && (
                <h3
                  style={{
                    fontSize: "calc(var(--note-font-size, 15.5px) * 1.15)",
                  }}
                  className={`font-bold text-[var(--text-primary)] tracking-tight leading-snug pb-1 ${
                    note.fontChoice === "sans"
                      ? "font-sans"
                      : note.fontChoice === "display"
                        ? "font-serif italic"
                        : "font-serif"
                  }`}
                >
                  {note.title}
                </h3>
              )}
              <span
                style={{ fontSize: "calc(11px * var(--font-scale, 1))" }}
                className="font-sans font-semibold tracking-wider opacity-45 uppercase select-none mr-2 inline-block"
              >
                {note.pinned && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-sans font-semibold text-[9.5px] uppercase tracking-wider mr-2 align-middle border border-[var(--text-primary)]/15 shadow-2xs"
                    title="Pinned notice"
                  >
                    <Pin className="w-2.5 h-2.5 fill-current rotate-45 shrink-0" />
                    <span>Pinned</span>
                  </span>
                )}
                {note.isConflictCopy && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--text-primary)]/10 text-[var(--text-secondary)] font-sans font-semibold text-[9.5px] uppercase tracking-wider mr-2 align-middle border border-[var(--glass-border)] shadow-2xs"
                    title="Safe-forked conflict copy"
                  >
                    <GitFork className="w-2.5 h-2.5 shrink-0" />
                    <span>Fork</span>
                  </span>
                )}
                {formattedTime}
                {note.locationName && (
                  <span className="inline-flex items-center gap-1 opacity-90 font-sans font-medium text-[10.5px] normal-case tracking-normal ml-1.5 align-middle">
                    <span className="opacity-40">·</span>
                    <MapPin className="w-2.5 h-2.5 stroke-[2] shrink-0 inline" />
                    <span>{note.locationName}</span>
                  </span>
                )}
                {isSharedSpace && (
                  <span className="inline-flex items-center gap-1 font-medium tracking-wide">
                    <span className="opacity-40">·</span>
                    {authorAvatar ? (
                      <img
                        src={authorAvatar}
                        alt={authorLabel}
                        className="w-3.5 h-3.5 rounded-full object-cover inline border border-[var(--glass-border)]"
                      />
                    ) : !isCurrentUserAuthor ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] text-[8px] font-bold flex items-center justify-center inline-flex leading-none border border-[var(--glass-border)]">
                        {authorLabel.charAt(0)}
                      </span>
                    ) : null}
                    <span
                      className={
                        isCurrentUserAuthor
                          ? "opacity-65"
                          : "text-[var(--text-primary)] font-semibold opacity-90"
                      }
                    >
                      {authorLabel}
                    </span>
                  </span>
                )}{" "}
                —
              </span>
              {note.content && (
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
              )}
              {renderParagraphEndSuperscripts()}
            </div>
          )}

          {/* Standalone timestamp if there is no text content and no title */}
          {!note.content && !note.title && (
            <div
              style={{ fontSize: "calc(11px * var(--font-scale, 1))" }}
              className="font-sans font-semibold tracking-wider text-[var(--text-primary)] uppercase select-none flex items-center justify-between w-full gap-2"
            >
              <span className="opacity-45">
                {note.pinned && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-sans font-semibold text-[9.5px] uppercase tracking-wider mr-2 align-middle border border-[var(--text-primary)]/15 shadow-2xs"
                    title="Pinned notice"
                  >
                    <Pin className="w-2.5 h-2.5 fill-current rotate-45 shrink-0" />
                    <span>Pinned</span>
                  </span>
                )}
                {note.isConflictCopy && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--text-primary)]/10 text-[var(--text-secondary)] font-sans font-semibold text-[9.5px] uppercase tracking-wider mr-2 align-middle border border-[var(--glass-border)] shadow-2xs"
                    title="Safe-forked conflict copy"
                  >
                    <GitFork className="w-2.5 h-2.5 shrink-0" />
                    <span>Fork</span>
                  </span>
                )}
                {formattedTime}
                {note.locationName && (
                  <span className="inline-flex items-center gap-1 opacity-90 font-sans font-medium text-[10.5px] normal-case tracking-normal ml-1.5 align-middle">
                    <span className="opacity-40">·</span>
                    <MapPin className="w-2.5 h-2.5 stroke-[2] shrink-0 inline" />
                    <span>{note.locationName}</span>
                  </span>
                )}
                {isSharedSpace && (
                  <span className="inline-flex items-center gap-1 font-medium tracking-wide">
                    <span className="opacity-40">·</span>
                    {authorAvatar ? (
                      <img
                        src={authorAvatar}
                        alt={authorLabel}
                        className="w-3.5 h-3.5 rounded-full object-cover inline border border-[var(--glass-border)]"
                      />
                    ) : !isCurrentUserAuthor ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] text-[8px] font-bold flex items-center justify-center inline-flex leading-none border border-[var(--glass-border)]">
                        {authorLabel.charAt(0)}
                      </span>
                    ) : null}
                    <span
                      className={
                        isCurrentUserAuthor
                          ? "opacity-65"
                          : "text-[var(--text-primary)] font-semibold opacity-90"
                      }
                    >
                      {authorLabel}
                    </span>
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-1 ml-auto">
                {renderParagraphEndSuperscripts()}
              </span>
            </div>
          )}

          {/* Bottom Media if imagePosition is bottom */}
          {effectiveImagePosition === "bottom" && (
            <div className="w-full space-y-3">
              {/* Photos attached under the note */}
              {hasPhotos && (
                <div className="w-full">
                  {note.photos!.length === 1 ? (
                    /* Single Photo */
                    (() => {
                      const meta = note.photosMeta?.[0];
                      const filterClass = meta?.filter
                        ? `film-filter-${meta.filter}`
                        : "";
                      const isPolaroid = meta?.frameMode === "polaroid";
                      const isArchival = meta?.frameMode === "archival";
                      const aspectClass = getAspectClass(meta);

                      const sizingClass =
                        imageFrameSize === "compact"
                          ? "w-full max-w-[210px] sm:max-w-[250px]"
                          : imageFrameSize === "editorial"
                            ? "w-full max-w-[82%] sm:max-w-[74%]"
                            : "w-full";

                      const alignClass =
                        imageFrameSize !== "full" && effectiveAlign === "center"
                          ? "mx-auto"
                          : imageFrameSize !== "full" &&
                              effectiveAlign === "right"
                            ? "ml-auto"
                            : "";

                      if (isPolaroid) {
                        return (
                          <div
                            onClick={() => onOpenPhotostrip?.(note)}
                            className={`cursor-pointer polaroid-frame-card p-3 sm:p-3.5 pb-4 sm:pb-5 rounded-2xl sm:rounded-3xl active:scale-[0.99] transition-all duration-300 ${sizingClass} ${alignClass}`}
                          >
                            <div
                              className={`relative ${aspectClass} rounded-xl overflow-hidden bg-black/5`}
                            >
                              <img
                                src={note.photos![0]}
                                alt="Captured moment"
                                className={`w-full h-full object-cover ${filterClass}`}
                                loading="lazy"
                                decoding="async"
                              />
                              {meta?.hasGrain && (
                                <div className="film-grain-overlay" />
                              )}
                            </div>

                            {/* Polaroid Typewriter Caption Bottom Margin */}
                            <div className="pt-2.5 sm:pt-3 px-1 flex items-baseline justify-between gap-2 border-t border-[var(--text-primary)]/10 mt-2">
                              <p className="font-typewriter text-[11px] sm:text-[12px] tracking-tight leading-snug truncate flex-1 opacity-90 text-[var(--text-primary)]">
                                {meta?.caption?.trim() || "—"}
                              </p>
                              <span className="font-typewriter text-[9px] sm:text-[10px] uppercase tracking-wider opacity-60 shrink-0 text-[var(--text-secondary)]">
                                {meta?.filter && meta.filter !== "natural"
                                  ? meta.filter.toUpperCase()
                                  : ""}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (isArchival) {
                        return (
                          <div
                            onClick={() => onOpenPhotostrip?.(note)}
                            className={`cursor-pointer active:scale-[0.99] transition-all duration-300 ${sizingClass} ${alignClass}`}
                          >
                            <div className="p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]">
                              <div
                                className={`relative ${aspectClass} overflow-hidden rounded-xl bg-black/5`}
                              >
                                <img
                                  src={note.photos![0]}
                                  alt="Captured moment"
                                  className={`w-full h-full object-cover ${filterClass}`}
                                  loading="lazy"
                                  decoding="async"
                                />
                                {meta?.hasGrain && (
                                  <div className="film-grain-overlay" />
                                )}
                              </div>
                              {meta?.caption?.trim() && (
                                <p className="font-serif italic text-center text-xs text-[var(--text-secondary)] pt-2 pb-0.5 px-2">
                                  {meta.caption}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          onClick={() => onOpenPhotostrip?.(note)}
                          className={`cursor-pointer active:scale-[0.99] transition-all duration-300 ${sizingClass} ${alignClass}`}
                        >
                          <div
                            className={`relative ${aspectClass} overflow-hidden bg-black/5 rounded-2xl sm:rounded-3xl border border-[var(--glass-border)]/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]`}
                          >
                            <img
                              src={note.photos![0]}
                              alt="Captured moment"
                              className={`w-full h-full object-cover ${filterClass}`}
                              loading="lazy"
                              decoding="async"
                            />
                            {meta?.hasGrain && (
                              <div className="film-grain-overlay" />
                            )}
                          </div>
                          {meta?.caption?.trim() && (
                            <p className="font-typewriter text-[11px] sm:text-[12px] text-[var(--text-secondary)] opacity-85 px-1 pt-1.5 truncate">
                              {meta.caption}
                            </p>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* Multi Photos: Horizontal strip with snap */
                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 snap-x">
                      {note.photos!.map((photoUrl, idx) => {
                        const meta = note.photosMeta?.[idx];
                        const filterClass = meta?.filter
                          ? `film-filter-${meta.filter}`
                          : "";
                        const isPolaroid = meta?.frameMode === "polaroid";
                        const isArchival = meta?.frameMode === "archival";
                        const aspectClass = getAspectClass(meta);

                        const sizingClass =
                          imageFrameSize === "compact"
                            ? "w-[46%] sm:w-[36%]"
                            : imageFrameSize === "editorial"
                              ? "w-[62%] sm:w-[48%]"
                              : "w-[76%] sm:w-[60%]";

                        if (isPolaroid) {
                          return (
                            <div
                              key={idx}
                              onClick={() => onOpenPhotostrip?.(note)}
                              className={`cursor-pointer shrink-0 snap-start polaroid-frame-card p-2.5 pb-3.5 sm:p-3 sm:pb-4 rounded-2xl active:scale-[0.99] transition-all duration-300 ${sizingClass}`}
                            >
                              <div
                                className={`relative ${aspectClass} rounded-lg overflow-hidden bg-black/5`}
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Captured moment ${idx + 1}`}
                                  className={`w-full h-full object-cover ${filterClass}`}
                                  loading="lazy"
                                  decoding="async"
                                />
                                {meta?.hasGrain && (
                                  <div className="film-grain-overlay" />
                                )}
                              </div>
                              {/* Polaroid Bottom Margin */}
                              <div className="pt-2 px-0.5 flex items-baseline justify-between gap-1.5 border-t border-[var(--text-primary)]/10 mt-1.5">
                                <p className="font-typewriter text-[10px] sm:text-[11px] tracking-tight leading-snug truncate flex-1 opacity-90 text-[var(--text-primary)]">
                                  {meta?.caption?.trim() || `Plate #${idx + 1}`}
                                </p>
                                <span className="font-typewriter text-[8.5px] uppercase tracking-wider opacity-60 shrink-0 text-[var(--text-secondary)]">
                                  {meta?.filter && meta.filter !== "natural"
                                    ? meta.filter.toUpperCase()
                                    : ""}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        if (isArchival) {
                          return (
                            <div
                              key={idx}
                              onClick={() => onOpenPhotostrip?.(note)}
                              className={`cursor-pointer shrink-0 snap-start active:scale-[0.99] transition-all duration-300 ${sizingClass}`}
                            >
                              <div className="p-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] shadow-md">
                                <div
                                  className={`relative ${aspectClass} overflow-hidden rounded-xl bg-black/5`}
                                >
                                  <img
                                    src={photoUrl}
                                    alt={`Captured moment ${idx + 1}`}
                                    className={`w-full h-full object-cover ${filterClass}`}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                  {meta?.hasGrain && (
                                    <div className="film-grain-overlay" />
                                  )}
                                </div>
                                {meta?.caption?.trim() && (
                                  <p className="font-serif italic text-center text-[10.5px] text-[var(--text-secondary)] pt-1.5 truncate">
                                    {meta.caption}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => onOpenPhotostrip?.(note)}
                            className={`cursor-pointer shrink-0 snap-start active:scale-[0.99] transition-all duration-300 space-y-1 ${sizingClass}`}
                          >
                            <div
                              className={`relative ${aspectClass} overflow-hidden bg-black/5 rounded-2xl sm:rounded-3xl border border-[var(--glass-border)]/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12)]`}
                            >
                              <img
                                src={photoUrl}
                                alt={`Captured moment ${idx + 1}`}
                                className={`w-full h-full object-cover ${filterClass}`}
                                loading="lazy"
                                decoding="async"
                              />
                              {meta?.hasGrain && (
                                <div className="film-grain-overlay" />
                              )}
                            </div>
                            {meta?.caption?.trim() && (
                              <p className="font-typewriter text-[10px] sm:text-[11px] text-[var(--text-secondary)] opacity-85 px-1 truncate">
                                {meta.caption}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Inline Videos */}
              {hasVideos && (
                <div className="w-full space-y-2.5">
                  {note.videos!.map((videoUrl, idx) => (
                    <div
                      key={idx}
                      className={`
                        ${
                          imageFrameSize === "compact"
                            ? "w-full max-w-[280px] sm:max-w-[320px]"
                            : imageFrameSize === "editorial"
                              ? "w-full max-w-[92%] sm:max-w-[84%]"
                              : "w-full"
                        }
                        ${
                          imageFrameSize !== "full" &&
                          effectiveAlign === "center"
                            ? "mx-auto"
                            : imageFrameSize !== "full" &&
                                effectiveAlign === "right"
                              ? "ml-auto"
                              : ""
                        }
                      `}
                    >
                      <InlineVideoPlayer src={videoUrl} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Audio Memo: Archival Letterpress Strip */}
          {note.voiceMemo?.audioUrl && (
            <div className="mt-1">
              <TactileAudioPlayer
                audioUrl={note.voiceMemo.audioUrl}
                durationSeconds={note.voiceMemo.durationSeconds}
                sourceId={`audio-${note.id}`}
              />
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
                        if (
                          !isReadingMode &&
                          !isReadOnly &&
                          onOpenQuickAnnotator
                        ) {
                          triggerHaptic("light");
                          onOpenQuickAnnotator(note);
                        }
                      }}
                      style={{
                        fontSize: "calc(var(--note-font-size, 15.5px) * 0.85)",
                      }}
                      className={`leading-relaxed font-serif text-[var(--text-secondary)] ${
                        !isReadingMode
                          ? "cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                          : ""
                      }`}
                      title={
                        !isReadingMode ? "Tap to edit footnote" : undefined
                      }
                    >
                      <span className="font-serif font-bold text-xs text-[var(--text-primary)] mr-1.5 select-none">
                        {toSuperscriptNumber(idx + 1)}
                      </span>
                      <span className="italic">{m.content}</span>
                      {m.citation && (
                        <span className="not-italic text-xs font-sans text-[var(--text-tertiary)] ml-1.5">
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
                        style={{
                          fontSize:
                            "calc(var(--note-font-size, 15.5px) * 0.85)",
                        }}
                        className="leading-relaxed font-serif text-[var(--text-secondary)]"
                      >
                        <span className="font-serif font-bold text-xs text-[var(--text-primary)] mr-1.5 select-none">
                          {toSuperscriptNumber(fnNum)}
                        </span>
                        <span className="italic">{hl.marginalia}</span>
                        <span className="not-italic text-xs font-sans text-[var(--text-tertiary)] ml-1.5">
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

          {/* Note Bottom Action Controls: Always anchored at the bottom of the note */}
          {!isReadingMode && (
            <div className="flex items-center justify-end pt-1.5 select-none">
              {renderInlineEndControls()}
            </div>
          )}
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
                  <p
                    style={{
                      fontSize: "calc(var(--note-font-size, 15.5px) * 0.85)",
                    }}
                    className="font-serif italic leading-relaxed"
                  >
                    <span className="not-italic font-serif font-bold text-xs text-[var(--text-primary)] mr-1 select-none">
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
                    <p
                      style={{
                        fontSize: "calc(var(--note-font-size, 15.5px) * 0.85)",
                      }}
                      className="font-serif italic leading-relaxed"
                    >
                      <span className="not-italic font-serif font-bold text-xs text-[var(--text-primary)] mr-1 select-none">
                        {toSuperscriptNumber(fnNum)}
                      </span>
                      {hl.marginalia}
                    </p>
                  </div>
                );
              })}

              {/* Add another footnote button on desktop hover */}
              {!isReadingMode && !isReadOnly && onOpenQuickAnnotator && (
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
          !isReadingMode && !isReadOnly && onOpenQuickAnnotator ? (
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
});
