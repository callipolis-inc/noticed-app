import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TextHighlight, HighlightStyle, MarginaliaItem } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { generateId } from "@/lib/utils";
import { Trash2, Check, X, MessageSquare, PenTool } from "lucide-react";
import { renderInlineMarkdown } from "@/lib/markdownRenderer";
import { useAppLanguage } from "@/lib/i18n";

const SUPERSCRIPT_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
export function toSuperscriptNumber(num: number): string {
  return String(num)
    .split("")
    .map((ch) => SUPERSCRIPT_DIGITS[Number(ch)] || ch)
    .join("");
}

interface TextHighlighterProps {
  content: string;
  highlights?: TextHighlight[];
  marginaliaItems?: MarginaliaItem[];
  isReadingMode?: boolean;
  className?: string;
  onSaveHighlight: (hl: TextHighlight) => void;
  onUpdateHighlight: (hl: TextHighlight) => void;
  onDeleteHighlight: (id: string) => void;
  onToggleFootnotes?: () => void;
}

interface SelectionMenuPosition {
  x: number;
  y: number;
  placeBelow?: boolean;
  startIndex: number;
  endIndex: number;
  selectedText: string;
}

function getCleanTextOffset(
  container: HTMLElement,
  targetNode: Node,
  targetOffset: number,
): number {
  try {
    const range = document.createRange();
    range.selectNodeContents(container);
    range.setEnd(targetNode, targetOffset);

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (parent && parent.closest("[data-footnote-badge='true']")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let offset = 0;
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode === targetNode) {
        offset += targetOffset;
        break;
      }
      const cmp = range.comparePoint(currentNode, 0);
      if (cmp < 0) {
        const textLen = currentNode.textContent?.length || 0;
        const endCmp = range.comparePoint(currentNode, textLen);
        if (endCmp <= 0) {
          offset += textLen;
        } else {
          break;
        }
      } else {
        break;
      }
      currentNode = walker.nextNode();
    }
    return offset;
  } catch {
    return 0;
  }
}

function clampPopoverPosition(rect: DOMRect): {
  x: number;
  y: number;
  placeBelow: boolean;
} {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 844;
  const halfPopoverWidth = Math.min(168, Math.floor((vw - 24) / 2));
  const centerX = rect.left + rect.width / 2;
  const x = Math.max(
    halfPopoverWidth + 12,
    Math.min(vw - halfPopoverWidth - 12, centerX),
  );
  // Keep extra clearance from iOS blue selection handles (~24px) and native callout bar
  const placeBelow = rect.top < 140 && rect.bottom + 96 < vh;
  const y = placeBelow ? rect.bottom + 28 : Math.max(56, rect.top - 24);
  return { x, y, placeBelow };
}

const ARCHIVAL_HIGHLIGHT_STYLES: Record<
  HighlightStyle,
  {
    labelEn: string;
    labelId: string;
    swatchColor: string;
    markStyle: React.CSSProperties;
  }
> = {
  graphite: {
    labelEn: "Pencil",
    labelId: "Pensil",
    swatchColor: "#78716c",
    markStyle: {
      backgroundColor: "rgba(120, 113, 108, 0.14)",
      borderBottom: "1.5px solid rgba(120, 113, 108, 0.48)",
    },
  },
  sepia: {
    labelEn: "Sepia",
    labelId: "Sepia",
    swatchColor: "#a86432",
    markStyle: {
      backgroundColor: "rgba(168, 100, 50, 0.16)",
      borderBottom: "1.5px solid rgba(168, 100, 50, 0.52)",
    },
  },
  cobalt: {
    labelEn: "Cobalt",
    labelId: "Kobalt",
    swatchColor: "#3b6291",
    markStyle: {
      backgroundColor: "rgba(59, 98, 145, 0.16)",
      borderBottom: "1.5px solid rgba(59, 98, 145, 0.52)",
    },
  },
};

export function TextHighlighter({
  content,
  highlights = [],
  marginaliaItems = [],
  isReadingMode: _isReadingMode = false,
  className = "",
  onSaveHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
  onToggleFootnotes,
}: TextHighlighterProps) {
  const [currentLang] = useAppLanguage();
  const containerRef = useRef<HTMLSpanElement>(null);
  const [menuPos, setMenuPos] = useState<SelectionMenuPosition | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(
    null,
  );
  const [activePopoverPos, setActivePopoverPos] = useState<{
    x: number;
    y: number;
    placeBelow?: boolean;
  } | null>(null);
  const [marginaliaInput, setMarginaliaInput] = useState("");
  const [isAddingMarginalia, setIsAddingMarginalia] = useState(false);

  const isInteractingWithMenuRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  const markTouchStartRef = useRef<{ x: number; y: number; id: string } | null>(
    null,
  );

  // Map highlight IDs that have marginalia to their sequential footnote number
  const highlightFootnoteIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    let nextNum = marginaliaItems.length + 1;
    for (const hl of highlights) {
      if (hl.marginalia) {
        map[hl.id] = nextNum++;
      }
    }
    return map;
  }, [highlights, marginaliaItems.length]);

  // Parse text segments taking highlights into account
  const segments = useMemo(() => {
    if (!highlights || highlights.length === 0) {
      return [{ text: content, highlight: null }];
    }

    const sorted = [...highlights].sort((a, b) => a.startIndex - b.startIndex);
    const result: { text: string; highlight: TextHighlight | null }[] = [];
    let currentIndex = 0;

    for (const hl of sorted) {
      if (hl.startIndex > currentIndex) {
        result.push({
          text: content.substring(currentIndex, hl.startIndex),
          highlight: null,
        });
      }

      const hlText = content.substring(
        Math.max(currentIndex, hl.startIndex),
        Math.min(content.length, hl.endIndex),
      );
      if (hlText.length > 0) {
        result.push({
          text: hlText,
          highlight: hl,
        });
      }

      currentIndex = Math.max(currentIndex, hl.endIndex);
    }

    if (currentIndex < content.length) {
      result.push({
        text: content.substring(currentIndex),
        highlight: null,
      });
    }

    return result;
  }, [content, highlights]);

  // Helper to inject sentence-anchored superscript numbers into plain text segments
  const renderPlainTextWithSentenceMarkers = (text: string, segKey: number) => {
    const anchored = marginaliaItems
      .map((item, idx) => ({
        sentence: item.targetSentence,
        num: idx + 1,
        content: item.content,
      }))
      .filter((a): a is { sentence: string; num: number; content: string } =>
        Boolean(a.sentence && text.includes(a.sentence)),
      );

    if (anchored.length === 0) {
      return <span key={segKey}>{renderInlineMarkdown(text)}</span>;
    }

    let remaining = text;
    const nodes: React.ReactNode[] = [];
    let partIdx = 0;

    const sortedAnchored = [...anchored].sort(
      (a, b) => text.indexOf(a.sentence) - text.indexOf(b.sentence),
    );

    for (const anchor of sortedAnchored) {
      const pos = remaining.indexOf(anchor.sentence);
      if (pos === -1) continue;

      const before = remaining.slice(0, pos + anchor.sentence.length);
      nodes.push(
        <span key={`${segKey}-p-${partIdx++}`}>
          {renderInlineMarkdown(before)}
        </span>,
      );
      nodes.push(
        <button
          key={`${segKey}-fn-${anchor.num}`}
          type="button"
          data-footnote-badge="true"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic("light");
            onToggleFootnotes?.();
          }}
          className="inline-flex items-center justify-center min-w-[22px] min-h-[22px] p-0.5 font-serif font-bold text-[11.5px] leading-none text-[var(--text-primary)] opacity-80 hover:opacity-100 active:scale-125 align-super ml-0.5 mr-0.5 cursor-pointer select-none transition-all rounded-full hover:bg-[var(--text-primary)]/10 touch-manipulation"
          title={`Footnote ${anchor.num}: ${anchor.content}`}
        >
          {toSuperscriptNumber(anchor.num)}
        </button>,
      );
      remaining = remaining.slice(pos + anchor.sentence.length);
    }

    if (remaining.length > 0) {
      nodes.push(
        <span key={`${segKey}-rest`}>{renderInlineMarkdown(remaining)}</span>,
      );
    }

    return <span key={segKey}>{nodes}</span>;
  };

  // Evaluate current DOM selection inside containerRef
  const evaluateCurrentSelection = useCallback(
    (withHaptic = false) => {
      if (typeof window === "undefined" || !containerRef.current) return;
      if (isInteractingWithMenuRef.current || isAddingMarginalia) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        return;
      }

      const rawStart = getCleanTextOffset(
        containerRef.current,
        range.startContainer,
        range.startOffset,
      );
      const rawEnd = getCleanTextOffset(
        containerRef.current,
        range.endContainer,
        range.endOffset,
      );
      if (rawEnd <= rawStart) return;

      const rawSlice = content.slice(rawStart, rawEnd);
      const leadingSpaces = rawSlice.length - rawSlice.trimStart().length;
      const trailingSpaces = rawSlice.length - rawSlice.trimEnd().length;
      const startIndex = rawStart + leadingSpaces;
      const endIndex = rawEnd - trailingSpaces;
      const selectedText = content.slice(startIndex, endIndex);

      if (selectedText.length === 0) return;

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const clamped = clampPopoverPosition(rect);
      if (withHaptic) {
        triggerHaptic("light");
      }

      setActiveHighlightId(null);
      setMenuPos((prev) => {
        if (
          prev &&
          prev.startIndex === startIndex &&
          prev.endIndex === endIndex &&
          Math.abs(prev.x - clamped.x) < 4 &&
          Math.abs(prev.y - clamped.y) < 4
        ) {
          return prev;
        }
        return {
          x: clamped.x,
          y: clamped.y,
          placeBelow: clamped.placeBelow,
          startIndex,
          endIndex,
          selectedText,
        };
      });
    },
    [content, isAddingMarginalia],
  );

  const handleSelectionGestureEnd = useCallback(() => {
    evaluateCurrentSelection(true);
    // iOS WebKit often finalizes word expansion 50-120ms after finger lift
    window.setTimeout(() => evaluateCurrentSelection(false), 75);
    window.setTimeout(() => evaluateCurrentSelection(false), 180);
  }, [evaluateCurrentSelection]);

  // Listen to native iOS / browser selectionchange so dragging blue selection handles updates the bar
  useEffect(() => {
    let debounceTimer: number | null = null;
    const handleSelectionChange = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        evaluateCurrentSelection(false);
      }, 90);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [evaluateCurrentSelection]);

  // Close menus on outside click/touch
  useEffect(() => {
    const handleGlobalPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(".highlight-tooltip-menu") ||
        target.closest(".highlight-edit-popover") ||
        target.closest("[data-highlight-mark='true']")
      ) {
        return;
      }
      setMenuPos(null);
      setActiveHighlightId(null);
      setIsAddingMarginalia(false);
    };

    window.addEventListener("mousedown", handleGlobalPointerDown);
    window.addEventListener("touchstart", handleGlobalPointerDown, {
      passive: true,
    });
    return () => {
      window.removeEventListener("mousedown", handleGlobalPointerDown);
      window.removeEventListener("touchstart", handleGlobalPointerDown);
    };
  }, []);

  const runGuardedAction = (action: () => void) => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 260) return;
    lastActionTimeRef.current = now;
    action();
  };

  const handleApplyHighlight = (style: HighlightStyle) => {
    if (!menuPos) return;
    triggerSuccessHaptic();

    const newHl: TextHighlight = {
      id: generateId(),
      startIndex: menuPos.startIndex,
      endIndex: menuPos.endIndex,
      selectedText: menuPos.selectedText,
      style,
      marginalia: marginaliaInput.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveHighlight(newHl);
    setMenuPos(null);
    setMarginaliaInput("");
    setIsAddingMarginalia(false);
    isInteractingWithMenuRef.current = false;

    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
  };

  const openHighlightEditPopover = (
    targetEl: HTMLElement,
    hl: TextHighlight,
  ) => {
    triggerHaptic("light");
    const rect = targetEl.getBoundingClientRect();
    const clamped = clampPopoverPosition(rect);
    setMenuPos(null);
    setActiveHighlightId(hl.id);
    setMarginaliaInput(hl.marginalia || "");
    setActivePopoverPos(clamped);
  };

  const handleSaveActiveMarginalia = (hl: TextHighlight) => {
    triggerSuccessHaptic();
    onUpdateHighlight({
      ...hl,
      marginalia: marginaliaInput.trim() || undefined,
    });
    setActiveHighlightId(null);
  };

  const handleChangeStyle = (hl: TextHighlight, style: HighlightStyle) => {
    triggerHaptic("light");
    onUpdateHighlight({
      ...hl,
      style,
    });
  };

  const activeHighlight = highlights.find((h) => h.id === activeHighlightId);

  return (
    <>
      {/* Passage Text Container with Selection Listener */}
      <span
        ref={containerRef}
        onMouseUp={handleSelectionGestureEnd}
        onTouchEnd={handleSelectionGestureEnd}
        className={`select-text ${className}`}
      >
        {segments.map((seg, idx) => {
          if (!seg.highlight) {
            return renderPlainTextWithSentenceMarkers(seg.text, idx);
          }

          const hl = seg.highlight;
          const styleDef =
            ARCHIVAL_HIGHLIGHT_STYLES[hl.style] ||
            ARCHIVAL_HIGHLIGHT_STYLES.graphite;
          const fnNumber = highlightFootnoteIndexMap[hl.id];

          return (
            <mark
              key={hl.id + idx}
              data-highlight-mark="true"
              style={styleDef.markStyle}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) {
                  markTouchStartRef.current = {
                    x: t.clientX,
                    y: t.clientY,
                    id: hl.id,
                  };
                }
              }}
              onTouchEnd={(e) => {
                const start = markTouchStartRef.current;
                markTouchStartRef.current = null;
                const t = e.changedTouches[0];
                if (
                  start &&
                  t &&
                  start.id === hl.id &&
                  Math.hypot(t.clientX - start.x, t.clientY - start.y) < 12
                ) {
                  // If user is not actively dragging a multi-word text selection, open the highlight popover immediately
                  const sel =
                    typeof window !== "undefined"
                      ? window.getSelection()
                      : null;
                  if (!sel || sel.isCollapsed) {
                    e.preventDefault();
                    e.stopPropagation();
                    const el = e.currentTarget as HTMLElement;
                    runGuardedAction(() => openHighlightEditPopover(el, hl));
                  }
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                const el = e.currentTarget as HTMLElement;
                runGuardedAction(() => openHighlightEditPopover(el, hl));
              }}
              className="cursor-pointer rounded-xs px-0.5 py-0.5 -my-0.5 transition-all duration-150 inline relative text-[var(--text-primary)] hover:opacity-90 touch-manipulation"
              title={
                hl.marginalia
                  ? `Footnote: ${hl.marginalia}`
                  : currentLang === "id"
                    ? "Ketuk untuk ubah stabilo / catatan kaki"
                    : "Tap to edit highlight / footnote"
              }
            >
              {renderInlineMarkdown(seg.text)}
              {hl.marginalia && fnNumber && (
                <button
                  type="button"
                  data-footnote-badge="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onToggleFootnotes?.();
                  }}
                  className="inline font-serif font-bold text-[11px] leading-none text-[var(--text-primary)] opacity-80 hover:opacity-100 select-none align-super ml-0.5 cursor-pointer touch-manipulation"
                  title={`Toggle footnote ${fnNumber}`}
                >
                  {toSuperscriptNumber(fnNumber)}
                </button>
              )}
            </mark>
          );
        })}
      </span>

      {/* 1. APPLE CALLOUT SELECTION TOOLTIP MENU (PORTAL) */}
      {typeof document !== "undefined" &&
        menuPos &&
        createPortal(
          <div
            className="highlight-tooltip-menu fixed z-[9998] pointer-events-auto select-none"
            style={{
              left: `${menuPos.x}px`,
              top: `${menuPos.y}px`,
              transform: menuPos.placeBelow
                ? "translate(-50%, 0%)"
                : "translate(-50%, -100%)",
            }}
            onPointerDown={(e) => {
              isInteractingWithMenuRef.current = true;
              e.stopPropagation();
            }}
            onPointerUp={() => {
              window.setTimeout(() => {
                isInteractingWithMenuRef.current = false;
              }, 200);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="
                p-1.5 rounded-2xl bg-[var(--bg-elevated)]/98
                backdrop-blur-[36px] saturate-[190%] border border-[var(--glass-border)]
                shadow-[0_16px_36px_-6px_rgba(0,0,0,0.32),0_4px_12px_rgba(0,0,0,0.12)]
                flex flex-col gap-1.5 text-xs text-[var(--text-primary)]
              "
            >
              {/* Quick Swatch Bar */}
              <div className="flex items-center gap-1">
                {(["graphite", "sepia", "cobalt"] as HighlightStyle[]).map(
                  (st) => {
                    const def = ARCHIVAL_HIGHLIGHT_STYLES[st];
                    return (
                      <button
                        key={st}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          runGuardedAction(() => handleApplyHighlight(st));
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          runGuardedAction(() => handleApplyHighlight(st));
                        }}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl inner-pseudo-glass text-[11.5px] font-medium flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer touch-manipulation"
                        title={currentLang === "id" ? def.labelId : def.labelEn}
                      >
                        <div
                          className="w-3 h-3 rounded-full shadow-2xs shrink-0"
                          style={{ backgroundColor: def.swatchColor }}
                        />
                        <span>
                          {currentLang === "id" ? def.labelId : def.labelEn}
                        </span>
                      </button>
                    );
                  },
                )}

                <div className="w-[1px] h-4 bg-[var(--glass-border)] opacity-60 mx-0.5" />

                {/* Attach Thought / Marginalia Button */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    runGuardedAction(() => {
                      triggerHaptic("light");
                      setIsAddingMarginalia((prev) => !prev);
                    });
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    runGuardedAction(() => {
                      triggerHaptic("light");
                      setIsAddingMarginalia((prev) => !prev);
                    });
                  }}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-[11.5px] font-medium flex items-center gap-1 active:scale-95 transition-all cursor-pointer touch-manipulation ${
                    isAddingMarginalia
                      ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                      : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  title={
                    currentLang === "id"
                      ? "Tambah catatan kaki"
                      : "Add footnote thought"
                  }
                >
                  <MessageSquare className="w-3.5 h-3.5 stroke-[2]" />
                  <span>{currentLang === "id" ? "Catatan" : "Note"}</span>
                </button>
              </div>

              {/* Inline Marginalia Input Form */}
              <AnimatePresence>
                {isAddingMarginalia && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-1.5 border-t border-[var(--glass-border)]/50 flex flex-col gap-1.5 overflow-hidden"
                  >
                    <input
                      type="text"
                      value={marginaliaInput}
                      onChange={(e) => setMarginaliaInput(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && marginaliaInput.trim()) {
                          e.preventDefault();
                          handleApplyHighlight("graphite");
                        }
                      }}
                      placeholder={
                        currentLang === "id"
                          ? "Tulis catatan kaki pada teks ini..."
                          : "Footnote on selected text..."
                      }
                      autoFocus
                      className="w-64 px-3 py-2 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                    />

                    <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] px-1">
                      <span>
                        {currentLang === "id"
                          ? "Tekan Enter untuk simpan"
                          : "Press enter to save"}
                      </span>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          runGuardedAction(() =>
                            handleApplyHighlight("graphite"),
                          );
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          runGuardedAction(() =>
                            handleApplyHighlight("graphite"),
                          );
                        }}
                        className="px-3 py-1 rounded-lg bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-[11px] active:scale-95 transition-transform shadow-xs cursor-pointer touch-manipulation"
                      >
                        {currentLang === "id" ? "Simpan ¹" : "Save ¹"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>,
          document.body,
        )}

      {/* 2. EXISTING HIGHLIGHT EDIT POPOVER (PORTAL) */}
      {typeof document !== "undefined" &&
        activeHighlight &&
        activePopoverPos &&
        createPortal(
          <div
            className="highlight-edit-popover fixed z-[9998] pointer-events-auto select-none"
            style={{
              left: `${activePopoverPos.x}px`,
              top: `${activePopoverPos.y}px`,
              transform: activePopoverPos.placeBelow
                ? "translate(-50%, 0%)"
                : "translate(-50%, -100%)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="
                p-2.5 rounded-2xl bg-[var(--bg-elevated)]/98
                backdrop-blur-[36px] saturate-[190%] border border-[var(--glass-border)]
                shadow-[0_16px_36px_-6px_rgba(0,0,0,0.32),0_4px_12px_rgba(0,0,0,0.12)]
                flex flex-col gap-2.5 min-w-[268px] max-w-xs text-xs text-[var(--text-primary)]
              "
            >
              {/* Header with Labeled Style Switcher & Actions */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-border)]/50 pb-2">
                <div className="flex items-center gap-1">
                  {(["graphite", "sepia", "cobalt"] as HighlightStyle[]).map(
                    (st) => {
                      const isCurrent = activeHighlight.style === st;
                      const def = ARCHIVAL_HIGHLIGHT_STYLES[st];
                      return (
                        <button
                          key={st}
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            runGuardedAction(() =>
                              handleChangeStyle(activeHighlight, st),
                            );
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            runGuardedAction(() =>
                              handleChangeStyle(activeHighlight, st),
                            );
                          }}
                          className={`min-h-[32px] px-2.5 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer touch-manipulation ${
                            isCurrent
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                              : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                          title={
                            currentLang === "id" ? def.labelId : def.labelEn
                          }
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: def.swatchColor,
                              border: isCurrent
                                ? "1px solid rgba(255,255,255,0.85)"
                                : "none",
                            }}
                          />
                          <span>
                            {currentLang === "id" ? def.labelId : def.labelEn}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      runGuardedAction(() => {
                        triggerHaptic("medium");
                        onDeleteHighlight(activeHighlight.id);
                        setActiveHighlightId(null);
                      });
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      runGuardedAction(() => {
                        triggerHaptic("medium");
                        onDeleteHighlight(activeHighlight.id);
                        setActiveHighlightId(null);
                      });
                    }}
                    style={{ color: "#9e3b33" }}
                    className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center hover:opacity-80 active:scale-90 transition-transform cursor-pointer touch-manipulation"
                    title={
                      currentLang === "id"
                        ? "Hapus Stabilo"
                        : "Remove Highlight"
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                  </button>

                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      runGuardedAction(() => setActiveHighlightId(null));
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      runGuardedAction(() => setActiveHighlightId(null));
                    }}
                    className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer touch-manipulation"
                    title={currentLang === "id" ? "Tutup" : "Close"}
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Edit Attached Marginalia Thought */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] uppercase font-mono text-[var(--text-tertiary)] font-semibold">
                  <PenTool className="w-2.5 h-2.5" />
                  <span>
                    {currentLang === "id"
                      ? "Catatan Kaki Tertaut"
                      : "Linked Marginalia"}
                  </span>
                </div>
                <input
                  type="text"
                  value={marginaliaInput}
                  onChange={(e) => setMarginaliaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveActiveMarginalia(activeHighlight);
                    }
                  }}
                  placeholder={
                    currentLang === "id"
                      ? "Tulis pemikiran pada kutipan ini..."
                      : "Footnote thought on this text..."
                  }
                  className="w-full px-3 py-2 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                />
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    runGuardedAction(() =>
                      handleSaveActiveMarginalia(activeHighlight),
                    );
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    runGuardedAction(() =>
                      handleSaveActiveMarginalia(activeHighlight),
                    );
                  }}
                  className="w-full py-2 rounded-xl bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-xs cursor-pointer touch-manipulation"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {currentLang === "id"
                      ? "Simpan Catatan Kaki"
                      : "Update Thought"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}
