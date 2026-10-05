import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FieldNote, Space } from "@/types";
import { formatTimeOnly, formatNoteDate } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { toSuperscriptNumber } from "./TextHighlighter";
import { X, Pin, BookOpen, Quote, ArrowUpRight, ListTree } from "lucide-react";

interface NotebookIndexSheetProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space;
  groupedNotes: { dateKey: string; notes: FieldNote[] }[];
  onSelectNote: (noteId: string) => void;
}

type IndexTab = "all" | "chronicle" | "bookmarks" | "footnotes";

export function NotebookIndexSheet({
  isOpen,
  onClose,
  space,
  groupedNotes,
  onSelectNote,
}: NotebookIndexSheetProps) {
  const [activeTab, setActiveTab] = useState<IndexTab>("all");

  const allNotes = useMemo(() => {
    return groupedNotes.flatMap((g) => g.notes);
  }, [groupedNotes]);

  const bookmarkedNotes = useMemo(() => {
    return allNotes.filter((n) => Boolean(n.pinned));
  }, [allNotes]);

  const footnoteIndex = useMemo(() => {
    const entries: {
      globalNum: number;
      noteId: string;
      createdAt: string;
      anchor?: string;
      content: string;
      citation?: string;
    }[] = [];

    for (const note of allNotes) {
      if (note.marginaliaItems && note.marginaliaItems.length > 0) {
        for (const item of note.marginaliaItems) {
          entries.push({
            globalNum: entries.length + 1,
            noteId: note.id,
            createdAt: note.createdAt,
            anchor: item.targetSentence,
            content: item.content,
            citation: item.citation,
          });
        }
      } else if (note.marginalia) {
        entries.push({
          globalNum: entries.length + 1,
          noteId: note.id,
          createdAt: note.createdAt,
          content: note.marginalia,
          citation: note.quoteSource,
        });
      }

      if (note.highlights && note.highlights.length > 0) {
        for (const hl of note.highlights) {
          if (hl.marginalia) {
            entries.push({
              globalNum: entries.length + 1,
              noteId: note.id,
              createdAt: note.createdAt,
              anchor: hl.selectedText,
              content: hl.marginalia,
            });
          }
        }
      }
    }

    return entries;
  }, [allNotes]);

  const handleJump = (noteId: string) => {
    triggerHaptic("light");
    onSelectNote(noteId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none">
          {/* Subtle Ambient Dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="fixed inset-0 bg-black/35 backdrop-blur-[6px] pointer-events-auto"
          />

          {/* Top Floating High-Density Liquid Glass Island */}
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="
              pointer-events-auto relative w-full max-w-sm sm:max-w-md
              dynamic-island-shell overflow-hidden z-10 flex flex-col
              bg-white/95 dark:bg-[#18181c]/95 backdrop-blur-[40px] saturate-[190%]
              border border-[var(--glass-border)]
              shadow-[0_28px_64px_-12px_rgba(0,0,0,0.24),0_8px_24px_-4px_rgba(0,0,0,0.08)]
              text-[var(--text-primary)]
            "
            style={{
              marginTop:
                "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
              maxHeight:
                "calc(100dvh - max(calc(env(safe-area-inset-top, 0px) + 12px), 20px) - 24px)",
            }}
          >
            {/* Top Specular Rim Reflection */}
            <div className="dynamic-island-specular-rim" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--glass-border)]/40 shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <ListTree className="w-4 h-4 text-[var(--text-secondary)] opacity-80" />
                <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                  Index
                </span>
                <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[150px]">
                  · {space.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                title="Close Index"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
              {/* Segmented Filter Pills */}
              <div className="apple-segmented-track w-full flex">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("all");
                  }}
                  className={`flex-1 apple-segmented-btn text-center !py-1 !px-2 ${
                    activeTab === "all"
                      ? "apple-segmented-btn-active font-semibold"
                      : ""
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("chronicle");
                  }}
                  className={`flex-1 apple-segmented-btn text-center !py-1 !px-2 ${
                    activeTab === "chronicle"
                      ? "apple-segmented-btn-active font-semibold"
                      : ""
                  }`}
                >
                  Passages ({allNotes.length})
                </button>
                {bookmarkedNotes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setActiveTab("bookmarks");
                    }}
                    className={`flex-1 apple-segmented-btn text-center !py-1 !px-2 ${
                      activeTab === "bookmarks"
                        ? "apple-segmented-btn-active font-semibold"
                        : ""
                    }`}
                  >
                    Pins ({bookmarkedNotes.length})
                  </button>
                )}
                {footnoteIndex.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setActiveTab("footnotes");
                    }}
                    className={`flex-1 apple-segmented-btn text-center !py-1 !px-2 ${
                      activeTab === "footnotes"
                        ? "apple-segmented-btn-active font-semibold"
                        : ""
                    }`}
                  >
                    Notes ({footnoteIndex.length})
                  </button>
                )}
              </div>

              {allNotes.length === 0 ? (
                <div className="py-16 text-center space-y-1">
                  <p className="font-serif italic text-sm text-[var(--text-tertiary)]">
                    No passages recorded in this volume yet.
                  </p>
                  <span className="text-[11px] text-[var(--text-tertiary)]/70">
                    Notices will appear indexed here as you write.
                  </span>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* SECTION I: BOOKMARKED PASSAGES */}
                  {(activeTab === "all" || activeTab === "bookmarks") &&
                    bookmarkedNotes.length > 0 && (
                      <section className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--text-tertiary)] px-1 font-semibold">
                          <Pin className="w-3 h-3 stroke-[2] opacity-70" />
                          <span>Bookmarks ({bookmarkedNotes.length})</span>
                        </div>

                        <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                          {bookmarkedNotes.map((note) => {
                            const label =
                              note.title ||
                              (note.content
                                ? note.content.split("\n")[0].slice(0, 64)
                                : "Photographic plate");
                            return (
                              <button
                                key={`bm-${note.id}`}
                                type="button"
                                onClick={() => handleJump(note.id)}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors cursor-pointer"
                              >
                                <span className="font-serif text-[13.5px] font-medium text-[var(--text-primary)] truncate flex-1">
                                  {label}
                                </span>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] shrink-0">
                                  {formatNoteDate(note.createdAt)} ·{" "}
                                  {formatTimeOnly(note.createdAt)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                  {/* SECTION II: CHRONICLE & DOTTED LEADERS */}
                  {(activeTab === "all" || activeTab === "chronicle") && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--text-tertiary)] px-1 font-semibold">
                        <BookOpen className="w-3 h-3 stroke-[2] opacity-70" />
                        <span>Passages ({allNotes.length})</span>
                      </div>

                      <div className="p-3.5 rounded-2xl apple-card space-y-4 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                        {groupedNotes.map((group) => (
                          <div key={group.dateKey} className="space-y-1.5">
                            <div className="text-[11px] font-serif italic text-[var(--text-secondary)] border-b border-[var(--glass-border)]/50 pb-1 flex items-center justify-between">
                              <span>{group.dateKey}</span>
                              <span className="font-mono not-italic text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                                {group.notes.length}{" "}
                                {group.notes.length === 1 ? "entry" : "entries"}
                              </span>
                            </div>

                            <div className="space-y-1">
                              {group.notes.map((note) => {
                                const hasTitle = Boolean(note.title);
                                const excerpt =
                                  note.title ||
                                  (note.content
                                    ? note.content
                                        .replace(/\s+/g, " ")
                                        .slice(0, 52) +
                                      (note.content.length > 52 ? "…" : "")
                                    : "Photographic plate");

                                return (
                                  <button
                                    key={`toc-${note.id}`}
                                    type="button"
                                    onClick={() => handleJump(note.id)}
                                    className="w-full py-1 px-1.5 rounded-lg flex items-baseline gap-2 text-left group hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer"
                                  >
                                    <span
                                      className={`font-serif text-[13px] truncate max-w-[68%] ${
                                        hasTitle
                                          ? "font-bold text-[var(--text-primary)]"
                                          : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                                      }`}
                                    >
                                      {excerpt}
                                    </span>

                                    {/* Dotted Leader Line */}
                                    <span className="flex-1 border-b border-dotted border-[var(--text-tertiary)]/40 mx-1 translate-y-[-3px]" />

                                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] shrink-0 font-medium">
                                      {formatTimeOnly(note.createdAt)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* SECTION III: FOOTNOTES & SIDENOTES */}
                  {(activeTab === "all" || activeTab === "footnotes") && (
                    <section className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.18em] text-[var(--text-tertiary)] px-1 font-semibold">
                        <Quote className="w-3 h-3 stroke-[2] opacity-70" />
                        <span>Footnotes ({footnoteIndex.length})</span>
                      </div>

                      {footnoteIndex.length === 0 ? (
                        <p className="text-xs font-serif italic text-[var(--text-tertiary)] px-1 py-1">
                          No footnotes recorded in this notebook yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {footnoteIndex.map((fn) => (
                            <button
                              key={`fn-${fn.globalNum}-${fn.noteId}`}
                              type="button"
                              onClick={() => handleJump(fn.noteId)}
                              className="w-full p-3 rounded-2xl apple-card text-left space-y-1.5 transition-all group cursor-pointer shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.85)] hover:opacity-90 active:scale-[0.99]"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <div className="font-serif text-xs leading-relaxed text-[var(--text-secondary)]">
                                  <span className="font-bold text-[var(--text-primary)] mr-1.5">
                                    {toSuperscriptNumber(fn.globalNum)}
                                  </span>
                                  {fn.anchor && (
                                    <span className="italic opacity-75 mr-1.5">
                                      "{fn.anchor}" —
                                    </span>
                                  )}
                                  <span className="italic text-[var(--text-primary)]">
                                    {fn.content}
                                  </span>
                                </div>

                                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] shrink-0 translate-y-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                              </div>

                              <div className="flex items-center justify-between text-[9.5px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] pt-0.5 border-t border-[var(--glass-border)]/40">
                                <span>
                                  {fn.citation
                                    ? `— ${fn.citation}`
                                    : "Footnote"}
                                </span>
                                <span>
                                  {formatNoteDate(fn.createdAt)} ·{" "}
                                  {formatTimeOnly(fn.createdAt)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
