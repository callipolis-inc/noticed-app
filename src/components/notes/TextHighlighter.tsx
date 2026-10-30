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

/**
 * Computes exact character [startIndex, endIndex] inside `container` for any DOM Range,
 * even across multiple <mark>/<span> segments or when selection handles touch outer nodes.
 */
function getSelectionOffsetsInContainer(
  container: HTMLElement,
  range: Range,
  fullContent: string,
): { startIndex: number; endIndex: number } | null {
  try {
    if (!range.intersectsNode(container)) {
      return null;
    }

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (parent && parent.closest("[data-footnote-badge='true']")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let rawStart = 0;
    let rawEnd = 0;
    let foundAnySelectedChar = false;

    let currentNode = walker.nextNode();
    while (currentNode) {
      const text = currentNode.textContent || "";
      const len = text.length;
      if (len > 0) {
        const startCmp = range.comparePoint(currentNode, 0);
        const endCmp = range.comparePoint(currentNode, len);

        if (endCmp === -1) {
          // Entire text node is strictly before selection start
          if (!foundAnySelectedChar) {
            rawStart += len;
          }
          rawEnd += len;
        } else if (startCmp === 1) {
          // Entire text node is strictly after selection end
          break;
        } else {
          // Selection overlaps this text node
          for (let i = 0; i < len; i++) {
            const cStart = range.comparePoint(currentNode, i);
            const cEnd = range.comparePoint(currentNode, i + 1);
            // Character [i, i+1] is before selection if its end point i+1 is before selection start (-1)
            if (cEnd === -1) {
              if (!foundAnySelectedChar) {
                rawStart++;
              }
              rawEnd++;
            } else if (cStart === 1) {
              // Character [i, i+1] is after selection end
              break;
            } else if (cStart <= 0 && cEnd >= 0) {
              // Check that selection doesn't end right at i or start right at i+1
              if (
                range.endContainer === currentNode &&
                range.endOffset <= i
              ) {
                break;
              }
              if (
                range.startContainer === currentNode &&
                range.startOffset >= i + 1
              ) {
                if (!foundAnySelectedChar) {
                  rawStart++;
                }
                rawEnd++;
                continue;
              }
              foundAnySelectedChar = true;
              rawEnd++;
            }
          }
        }
      }
      currentNode = walker.nextNode();
    }

    if (foundAnySelectedChar && rawEnd > rawStart) {
      return {
        startIndex: Math.max(0, Math.min(fullContent.length, rawStart)),
        endIndex: Math.max(0, Math.min(fullContent.length, rawEnd)),
      };
    }

    // Fallback: match selected string directly inside fullContent
    const rawStr = range.toString().trim();
    if (rawStr.length > 0) {
      const idx = fullContent.indexOf(rawStr);
      if (idx !== -1) {
        return { startIndex: idx, endIndex: idx + rawStr.length };
      }
    }

    return null;
  } catch {
    const rawStr = range.toString().trim();
    if (rawStr.length > 0) {
      const idx = fullContent.indexOf(rawStr);
      if (idx !== -1) {
        return { startIndex: idx, endIndex: idx + rawStr.length };
      }
    }
    return null;
  }
}

/**
 * Positions the Highlight Pop-up Modal outside the [rect.top - 58px, rect.bottom + 60px] band
 * where iOS renders native selection handles and the (Copy | Look Up | Translate) callout.
 */
function clampPopoverPosition(
  rect: DOMRect,
  isEditPopover = false,
): {
  x: number;
  y: number;
  placeBelow: boolean;
} {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 844;
  const halfPopoverWidth = Math.min(168, Math.floor((vw - 20) / 2));
  const centerX = rect.left + rect.width / 2;
  const x = Math.max(
    halfPopoverWidth + 10,
    Math.min(vw - halfPopoverWidth - 10, centerX),
  );

  if (isEditPopover) {
    // Existing highlight tap does not trigger iOS native text selection callout
    const placeBelow = rect.top < 140 && rect.bottom + 140 < vh;
    const y = placeBelow ? rect.bottom + 14 : Math.max(56, rect.top - 14);
    return { x, y, placeBelow };
  }

  // For live text selection on iOS: clear the 60px native callout + handle zone
  const placeBelow = rect.top < 165 && rect.bottom + 130 < vh;
  const y = placeBelow
    ? Math.min(vh - 96, rect.bottom + 68)
    : Math.max(62, rect.top - 66);
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
      backgroundColor: "rgba(120, 113, 108, 0.16)",
      borderBottom: "1.5px solid rgba(120, 113, 108, 0.52)",
    },
  },
  sepia: {
    labelEn: "Sepia",
    labelId: "Sepia",
    swatchColor: "#a86432",
    markStyle: {
      backgroundColor: "rgba(168, 100, 50, 0.18)",
      borderBottom: "1.5px solid rgba(168, 100, 50, 0.56)",
    },
  },
  cobalt: {
    labelEn: "Cobalt",
    labelId: "Kobalt",
    swatchColor: "#3b6291",
    markStyle: {
      backgroundColor: "rgba(59, 98, 145, 0.18)",
      borderBottom: "1.5px solid rgba(59, 98, 145, 0.56)",
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
  const marginaliaInputRef = useRef<HTMLInputElement>(null);
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

  // Combine saved highlights + temporary active selection preview when typing a Note
  const effectiveHighlights = useMemo(() => {
    if (!isAddingMarginalia || !menuPos) return highlights;
    const previewHl: TextHighlight = {
      id: "__preview_selection__",
      startIndex: menuPos.startIndex,
      endIndex: menuPos.endIndex,
      selectedText: menuPos.selectedText,
      style: "graphite",
      createdAt: "",
    };
    return [...highlights, previewHl];
  }, [highlights, isAddingMarginalia, menuPos]);

  // Parse text segments taking highlights into account
  const segments = useMemo(() => {
    if (!effectiveHighlights || effectiveHighlights.length === 0) {
      return [{ text: content, highlight: null }];
    }

    const sorted = [...effectiveHighlights].sort(
      (a, b) => a.startIndex - b.startIndex,
    );
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
  }, [content, effectiveHighlights]);

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
      if (isAddingMarginalia) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      const offsets = getSelectionOffsetsInContainer(
        containerRef.current,
        range,
        content,
      );
      if (!offsets) return;

      const rawSlice = content.slice(offsets.startIndex, offsets.endIndex);
      const leadingSpaces = rawSlice.length - rawSlice.trimStart().length;
      const trailingSpaces = rawSlice.length - rawSlice.trimEnd().length;
      const startIndex = offsets.startIndex + leadingSpaces;
      const endIndex = offsets.endIndex - trailingSpaces;
      const selectedText = content.slice(startIndex, endIndex);

      if (selectedText.length === 0) return;

      let rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        const rects = range.getClientRects();
        if (rects.length > 0) {
          rect = rects[0];
        } else {
          rect = containerRef.current.getBoundingClientRect();
        }
      }

      const clamped = clampPopoverPosition(rect, false);
      if (withHaptic) {
        triggerHaptic("light");
      }

      setActiveHighlightId(null);
      setMenuPos((prev) => {
        if (
          prev &&
          prev.startIndex === startIndex &&
          prev.endIndex === endIndex &&
          Math.abs(prev.x - clamped.x) < 3 &&
          Math.abs(prev.y - clamped.y) < 3
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
    window.setTimeout(() => evaluateCurrentSelection(false), 60);
    window.setTimeout(() => evaluateCurrentSelection(false), 160);
    window.setTimeout(() => evaluateCurrentSelection(false), 320);
  }, [evaluateCurrentSelection]);

  // Listen to native iOS / browser selectionchange so dragging blue selection handles updates the bar
  useEffect(() => {
    let debounceTimer: number | null = null;
    const handleSelectionChange = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        evaluateCurrentSelection(false);
      }, 65);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [evaluateCurrentSelection]);

  // Close menus ONLY when tapping outside both the popovers and the note text container
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
      // If user tapped inside containerRef to start a new selection, only close edit popover
      if (containerRef.current && containerRef.current.contains(target)) {
        setActiveHighlightId(null);
        if (!isAddingMarginalia) {
          setMenuPos(null);
        }
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
  }, [isAddingMarginalia]);

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

    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleToggleAddMarginalia = () => {
    triggerHaptic("light");
    const nextState = !isAddingMarginalia;
    setIsAddingMarginalia(nextState);
    if (nextState) {
      // Dismiss native iOS (Copy | Look Up | Translate) menu so the footnote input has zero obstruction
      if (typeof window !== "undefined") {
        window.getSelection()?.removeAllRanges();
      }
      window.setTimeout(() => {
        marginaliaInputRef.current?.focus();
      }, 60);
    }
  };

  const openHighlightEditPopover = (
    targetEl: HTMLElement,
    hl: TextHighlight,
  ) => {
    if (hl.id === "__preview_selection__") return;
    triggerHaptic("light");
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    const rect = targetEl.getBoundingClientRect();
    const clamped = clampPopoverPosition(rect, true);
    setMenuPos(null);
    setIsAddingMarginalia(false);
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
              onClick={(e) => {
                e.stopPropagation();
                openHighlightEditPopover(e.currentTarget as HTMLElement, hl);
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

      {/* 1. SELECTION HIGHLIGHT POP-UP MODAL (PORTAL) */}
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
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="
                p-1.5 rounded-2xl bg-[var(--bg-elevated)]/98
                backdrop-blur-[36px] saturate-[190%] border border-[var(--glass-border)]
                shadow-[0_16px_36px_-6px_rgba(0,0,0,0.34),0_4px_12px_rgba(0,0,0,0.14)]
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
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyHighlight(st);
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl inner-pseudo-glass text-[11.5px] font-medium flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer touch-manipulation"
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleAddMarginalia();
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-[11.5px] font-medium flex items-center gap-1 active:scale-95 transition-all cursor-pointer touch-manipulation ${
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
                      ref={marginaliaInputRef}
                      type="text"
                      value={marginaliaInput}
                      onChange={(e) => setMarginaliaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyHighlight("graphite");
                        }
                      }}
                      placeholder={
                        currentLang === "id"
                          ? "Tulis catatan kaki pada teks ini..."
                          : "Footnote on selected text..."
                      }
                      className="w-64 px-3 py-2 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] select-text"
                    />

                    <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] px-1">
                      <span>
                        {currentLang === "id"
                          ? "Pilih warna di atas atau tekan Simpan"
                          : "Tap a color above or press Save"}
                      </span>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyHighlight("graphite");
                        }}
                        className="min-h-[30px] px-3 py-1 rounded-lg bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-[11px] active:scale-95 transition-transform shadow-xs cursor-pointer touch-manipulation"
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
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="
                p-2.5 rounded-2xl bg-[var(--bg-elevated)]/98
                backdrop-blur-[36px] saturate-[190%] border border-[var(--glass-border)]
                shadow-[0_16px_36px_-6px_rgba(0,0,0,0.34),0_4px_12px_rgba(0,0,0,0.14)]
                flex flex-col gap-2.5 min-w-[272px] max-w-xs text-xs text-[var(--text-primary)]
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
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChangeStyle(activeHighlight, st);
                          }}
                          className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer touch-manipulation ${
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
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("medium");
                      onDeleteHighlight(activeHighlight.id);
                      setActiveHighlightId(null);
                    }}
                    className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-archival-carmine hover:opacity-80 active:scale-90 transition-transform cursor-pointer touch-manipulation"
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
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveHighlightId(null);
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
                  className="w-full px-3 py-2 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] select-text"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveActiveMarginalia(activeHighlight);
                  }}
                  className="w-full min-h-[36px] py-2 rounded-xl bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-xs cursor-pointer touch-manipulation"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {currentLang === "id"
                      ? "Simpan Catatan Kaki"
                      : "Save Thought"}
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
