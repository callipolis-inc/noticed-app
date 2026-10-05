import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FieldNote, MarginaliaItem } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { generateId, formatTimeOnly } from "@/lib/utils";
import {
  X,
  Check,
  Quote,
  Trash2,
  Plus,
  BookOpen,
  CornerDownRight,
} from "lucide-react";

const SUPERSCRIPT_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
function toSuperscript(num: number): string {
  return String(num)
    .split("")
    .map((ch) => SUPERSCRIPT_DIGITS[Number(ch)] || ch)
    .join("");
}

interface QuickAnnotatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: FieldNote | null;
  onSaveMarginalia: (
    noteId: string,
    marginaliaItems: MarginaliaItem[],
    marginalia?: string,
    quoteSource?: string,
  ) => void;
}

export function QuickAnnotatorModal({
  isOpen,
  onClose,
  note,
  onSaveMarginalia,
}: QuickAnnotatorModalProps) {
  // Retain note during exit animation when parent sets `note` to null
  const [cachedNote, setCachedNote] = useState<FieldNote | null>(note);
  useEffect(() => {
    if (note) setCachedNote(note);
  }, [note]);

  const activeNote = note || cachedNote;

  const [items, setItems] = useState<MarginaliaItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [contentInput, setContentInput] = useState("");
  const [citationInput, setCitationInput] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sentences = useMemo(() => {
    if (!activeNote?.content) return [];
    const raw = activeNote.content.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [];
    return raw.map((s) => s.trim()).filter((s) => s.length > 0);
  }, [activeNote?.content]);

  // Initialize modal state when opened or when note ID changes
  useEffect(() => {
    if (isOpen && activeNote) {
      let initialItems: MarginaliaItem[] = [];

      if (activeNote.marginaliaItems && activeNote.marginaliaItems.length > 0) {
        initialItems = activeNote.marginaliaItems.map((item) => ({ ...item }));
      } else if (activeNote.marginalia) {
        initialItems = [
          {
            id: generateId(),
            content: activeNote.marginalia,
            citation: activeNote.quoteSource || "",
            createdAt: activeNote.createdAt,
          },
        ];
      } else {
        initialItems = [
          {
            id: generateId(),
            content: "",
            citation: "",
            createdAt: new Date().toISOString(),
          },
        ];
      }

      setItems(initialItems);
      setActiveItemIndex(0);
      setContentInput(initialItems[0]?.content || "");
      setCitationInput(initialItems[0]?.citation || "");

      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeNote?.id]);

  // Mobile virtual keyboard handling
  useEffect(() => {
    if (!isOpen || typeof window === "undefined" || !window.visualViewport) {
      setKeyboardOffset(0);
      return;
    }

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = window.innerHeight - (vv.height + vv.offsetTop);
      const isKeyboardActive = offset > 80;
      setKeyboardOffset(isKeyboardActive ? Math.max(0, Math.round(offset)) : 0);
    };

    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener(
        "resize",
        handleViewportChange,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        handleViewportChange,
      );
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        triggerHaptic("light");
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Keep active item synced with input fields
  const handleContentChange = (val: string) => {
    setContentInput(val);
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === activeItemIndex ? { ...item, content: val } : item,
      ),
    );
  };

  const handleCitationChange = (val: string) => {
    setCitationInput(val);
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === activeItemIndex ? { ...item, citation: val } : item,
      ),
    );
  };

  const handleToggleTargetSentence = (sentence: string) => {
    triggerHaptic("light");
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== activeItemIndex) return item;
        const isSame = item.targetSentence === sentence;
        return { ...item, targetSentence: isSame ? undefined : sentence };
      }),
    );
  };

  const handleSelectItem = (idx: number) => {
    triggerHaptic("light");
    setActiveItemIndex(idx);
    setContentInput(items[idx]?.content || "");
    setCitationInput(items[idx]?.citation || "");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleAddNewItem = () => {
    triggerHaptic("light");
    const newItem: MarginaliaItem = {
      id: generateId(),
      content: "",
      citation: "",
      createdAt: new Date().toISOString(),
    };
    const updated = [...items, newItem];
    setItems(updated);
    const newIdx = updated.length - 1;
    setActiveItemIndex(newIdx);
    setContentInput("");
    setCitationInput("");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleRemoveActiveItem = (idxToRemove: number) => {
    triggerHaptic("medium");
    const filtered = items.filter((_, idx) => idx !== idxToRemove);
    if (filtered.length === 0) {
      const emptyItem: MarginaliaItem = {
        id: generateId(),
        content: "",
        citation: "",
        createdAt: new Date().toISOString(),
      };
      setItems([emptyItem]);
      setActiveItemIndex(0);
      setContentInput("");
      setCitationInput("");
    } else {
      const nextIdx = Math.max(0, Math.min(idxToRemove, filtered.length - 1));
      setItems(filtered);
      setActiveItemIndex(nextIdx);
      setContentInput(filtered[nextIdx]?.content || "");
      setCitationInput(filtered[nextIdx]?.citation || "");
    }
  };

  const handleSave = () => {
    if (!activeNote) return;

    const validItems = items.filter((it) => it.content.trim().length > 0);

    triggerSuccessHaptic();

    if (validItems.length === 0) {
      onSaveMarginalia(activeNote.id, [], undefined, undefined);
    } else {
      const primary = validItems[0];
      onSaveMarginalia(
        activeNote.id,
        validItems,
        primary.content,
        primary.citation || undefined,
      );
    }

    onClose();
  };

  if (typeof document === "undefined") return null;

  const noteSnippet =
    activeNote?.content && activeNote.content.length > 90
      ? `${activeNote.content.substring(0, 90)}...`
      : activeNote?.content || "Attached media capture";

  const formattedTime = activeNote?.createdAt
    ? formatTimeOnly(activeNote.createdAt)
    : "";

  return createPortal(
    <AnimatePresence>
      {isOpen && activeNote && (
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
            animate={{
              y: keyboardOffset > 0 ? -Math.min(keyboardOffset * 0.45, 120) : 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="
              pointer-events-auto relative w-full max-w-sm sm:max-w-md
              dynamic-island-shell overflow-hidden z-10 flex flex-col
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
                <span className="marginalia-stamp font-serif font-bold text-base text-[var(--text-primary)]">
                  ¹
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                    Footnote
                  </h3>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
                    Annotator
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 space-y-4 overflow-y-auto no-scrollbar flex-1 relative z-10">
              {/* Interactive Target Sentence Selector Card */}
              <div className="p-3.5 rounded-2xl apple-card space-y-2 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.85)]">
                <div className="flex items-center justify-between text-[10px] font-mono font-semibold tracking-wider uppercase text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <BookOpen className="w-3 h-3 stroke-[2] opacity-80" />
                    <span>
                      {sentences.length > 0
                        ? `Anchor Sentence (${toSuperscript(activeItemIndex + 1)})`
                        : "Passage"}
                    </span>
                  </span>
                  <span>{formattedTime}</span>
                </div>

                {sentences.length > 0 ? (
                  <div className="text-xs font-content leading-relaxed text-[var(--text-secondary)] space-x-1">
                    {sentences.map((sent, sIdx) => {
                      const isSelected =
                        items[activeItemIndex]?.targetSentence === sent;
                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleToggleTargetSentence(sent)}
                          className={`inline text-left rounded-md px-1.5 py-0.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs"
                              : "hover:bg-[var(--text-primary)]/8 text-[var(--text-primary)] opacity-85 hover:opacity-100"
                          }`}
                        >
                          {sent}
                          {isSelected && (
                            <sup className="ml-0.5 font-serif font-bold text-[10px]">
                              {toSuperscript(activeItemIndex + 1)}
                            </sup>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-serif italic text-[var(--text-secondary)] leading-relaxed">
                    "{noteSnippet}"
                  </p>
                )}

                {sentences.length > 0 && (
                  <div className="text-[10px] text-[var(--text-tertiary)] pt-0.5">
                    {items[activeItemIndex]?.targetSentence
                      ? `Anchored to selected sentence ${toSuperscript(activeItemIndex + 1)}`
                      : `Anchored at end of paragraph ${toSuperscript(activeItemIndex + 1)}`}
                  </div>
                )}
              </div>

              {/* Footnote Index Selector Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                  {items.map((it, idx) => (
                    <button
                      key={it.id || idx}
                      type="button"
                      onClick={() => handleSelectItem(idx)}
                      className={`
                        px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer
                        ${
                          idx === activeItemIndex
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs"
                            : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }
                      `}
                    >
                      <span className="font-serif font-bold text-xs">
                        {toSuperscript(idx + 1)}
                      </span>
                      <span className="max-w-[70px] truncate text-[11px]">
                        {it.citation || "Note"}
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="px-2.5 py-1 rounded-full border border-dashed border-[var(--glass-border)] text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-0.5 shrink-0 cursor-pointer"
                    title="Add another footnote"
                  >
                    <Plus className="w-3 h-3 stroke-[2]" />
                    <span className="text-[10px]">Add</span>
                  </button>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveActiveItem(activeItemIndex)}
                    className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-tertiary)] hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                    title="Delete this footnote"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
                  </button>
                )}
              </div>

              {/* Active Annotation Editor Card */}
              <div className="p-3.5 rounded-2xl apple-card space-y-3 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                <div className="flex items-center justify-between text-[11px] font-sans uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                    <span className="font-serif font-bold text-sm">
                      {toSuperscript(activeItemIndex + 1)}
                    </span>
                    <span>Sidenote Commentary</span>
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] font-medium">
                    {contentInput.length}c
                  </span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={contentInput}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  placeholder="Reflective footnote or companion observation..."
                  rows={4}
                  className="
                    w-full bg-transparent resize-none border-0 p-0
                    text-[14px] leading-relaxed font-serif italic text-[var(--text-primary)]
                    placeholder:text-[var(--text-tertiary)]/50 focus:outline-none
                  "
                />

                {/* Citation / Source Field */}
                <div className="pt-2 border-t border-[var(--glass-border)]/50 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] select-none shrink-0 font-medium">
                    <Quote className="w-3 h-3 stroke-[2] opacity-70" />
                    <span>Citation:</span>
                  </div>
                  <input
                    type="text"
                    value={citationInput}
                    onChange={(e) => handleCitationChange(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleSave();
                      }
                    }}
                    placeholder="e.g. Orwell (1945), Bab III"
                    className="
                      flex-1 bg-transparent border-0 p-0 text-xs font-sans
                      text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 focus:outline-none
                    "
                  />
                </div>
              </div>

              {/* Minimal Hint */}
              <div className="flex items-center justify-between text-[10.5px] text-[var(--text-tertiary)] px-1">
                <span className="flex items-center gap-1">
                  <CornerDownRight className="w-3 h-3 shrink-0 opacity-70" />
                  <span>Footnotes appear in stream & gutter</span>
                </span>
                <span className="hidden sm:inline font-mono text-[9.5px]">
                  Cmd+Enter
                </span>
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-[var(--glass-border)]/40 relative z-10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  if (activeNote) {
                    onSaveMarginalia(activeNote.id, [], undefined, undefined);
                  }
                  onClose();
                }}
                className="text-xs text-[var(--text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer py-1 px-1 font-medium"
              >
                Clear All
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-full inner-pseudo-glass text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer shadow-xs font-medium"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="
                    px-4 py-1.5 rounded-full
                    bg-[var(--text-primary)] text-[var(--accent-ink)]
                    text-xs font-semibold
                    flex items-center gap-1.5
                    shadow-[0_2px_8px_rgba(0,0,0,0.12)] active:scale-95 transition-transform cursor-pointer
                  "
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
