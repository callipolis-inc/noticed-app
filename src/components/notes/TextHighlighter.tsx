import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TextHighlight, HighlightStyle, MarginaliaItem } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { generateId } from "@/lib/utils";
import { Trash2, Check, X, MessageSquare, PenTool } from "lucide-react";

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
}

function clampPopoverPosition(rect: DOMRect): {
  x: number;
  y: number;
  placeBelow: boolean;
} {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const halfPopoverWidth = 148;
  const x = Math.max(
    halfPopoverWidth,
    Math.min(vw - halfPopoverWidth, rect.left + rect.width / 2),
  );
  const placeBelow = rect.top < 112;
  const y = placeBelow ? rect.bottom + 10 : rect.top - 10;
  return { x, y, placeBelow };
}

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
      return <span key={segKey}>{text}</span>;
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
      nodes.push(<span key={`${segKey}-p-${partIdx++}`}>{before}</span>);
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
          className="inline font-serif font-bold text-[11px] leading-none text-[var(--text-primary)] opacity-75 hover:opacity-100 align-super ml-0.5 mr-0.5 cursor-pointer select-none transition-opacity"
          title={`Footnote ${anchor.num}: ${anchor.content}`}
        >
          {toSuperscriptNumber(anchor.num)}
        </button>,
      );
      remaining = remaining.slice(pos + anchor.sentence.length);
    }

    if (remaining.length > 0) {
      nodes.push(<span key={`${segKey}-rest`}>{remaining}</span>);
    }

    return <span key={segKey}>{nodes}</span>;
  };

  // Handle selection on mouseUp / touchEnd
  const handleSelection = () => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || !containerRef.current) {
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
    const clamped = clampPopoverPosition(rect);
    triggerHaptic("light");

    setMenuPos({
      x: clamped.x,
      y: clamped.y,
      placeBelow: clamped.placeBelow,
      startIndex,
      endIndex,
      selectedText,
    });
    setIsAddingMarginalia(false);
    setMarginaliaInput("");
  };

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".highlight-tooltip-menu") &&
        !target.closest(".highlight-edit-popover")
      ) {
        setMenuPos(null);
        setActiveHighlightId(null);
      }
    };

    window.addEventListener("mousedown", handleGlobalClick);
    return () => window.removeEventListener("mousedown", handleGlobalClick);
  }, []);

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

  const handleHighlightClick = (e: React.MouseEvent, hl: TextHighlight) => {
    e.stopPropagation();
    triggerHaptic("light");
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clamped = clampPopoverPosition(rect);
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
        onMouseUp={handleSelection}
        onTouchEnd={handleSelection}
        className={`select-text ${className}`}
      >
        {segments.map((seg, idx) => {
          if (!seg.highlight) {
            return renderPlainTextWithSentenceMarkers(seg.text, idx);
          }

          const hl = seg.highlight;
          const isGraphite = hl.style === "graphite";
          const isSepia = hl.style === "sepia";
          const fnNumber = highlightFootnoteIndexMap[hl.id];

          return (
            <mark
              key={hl.id + idx}
              onClick={(e) => handleHighlightClick(e, hl)}
              className={`
                cursor-pointer rounded-xs px-0.5 transition-all duration-150 inline relative
                ${
                  isGraphite
                    ? "bg-[var(--text-primary)]/10 text-[var(--text-primary)] border-b-[1.5px] border-[var(--text-primary)]/40 hover:bg-[var(--text-primary)]/15"
                    : isSepia
                      ? "bg-amber-700/15 text-[var(--text-primary)] border-b-[1.5px] border-amber-700/40 hover:bg-amber-700/20"
                      : "bg-blue-700/15 text-[var(--text-primary)] border-b-[1.5px] border-blue-700/40 hover:bg-blue-700/20"
                }
              `}
              title={
                hl.marginalia
                  ? `Footnote: ${hl.marginalia}`
                  : "Highlighted passage"
              }
            >
              {seg.text}
              {hl.marginalia && fnNumber && (
                <button
                  type="button"
                  data-footnote-badge="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onToggleFootnotes?.();
                  }}
                  className="inline font-serif font-bold text-[11px] leading-none text-[var(--text-primary)] opacity-80 hover:opacity-100 select-none align-super ml-0.5 cursor-pointer"
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
            className="highlight-tooltip-menu fixed z-[9995] pointer-events-auto"
            style={{
              left: `${menuPos.x}px`,
              top: `${menuPos.y}px`,
              transform: menuPos.placeBelow
                ? "translate(-50%, 0%)"
                : "translate(-50%, -100%)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="
                p-1.5 rounded-2xl bg-white/95 dark:bg-[#1c1c20]/95
                backdrop-blur-[36px] saturate-[190%] border border-[var(--glass-border)]
                shadow-[0_16px_36px_-6px_rgba(0,0,0,0.28),0_4px_12px_rgba(0,0,0,0.08)]
                flex flex-col gap-1.5 text-xs text-[var(--text-primary)]
              "
            >
              {/* Quick Swatch Bar */}
              <div className="flex items-center gap-1">
                {/* Graphite */}
                <button
                  type="button"
                  onClick={() => handleApplyHighlight("graphite")}
                  className="px-2.5 py-1 rounded-xl inner-pseudo-glass text-[11px] font-medium flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                  title="Graphite Pencil"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-500 shadow-2xs" />
                  <span>Pencil</span>
                </button>

                {/* Sepia */}
                <button
                  type="button"
                  onClick={() => handleApplyHighlight("sepia")}
                  className="px-2.5 py-1 rounded-xl inner-pseudo-glass text-[11px] font-medium flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                  title="Warm Sepia"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-700 shadow-2xs" />
                  <span>Sepia</span>
                </button>

                {/* Cobalt */}
                <button
                  type="button"
                  onClick={() => handleApplyHighlight("cobalt")}
                  className="px-2.5 py-1 rounded-xl inner-pseudo-glass text-[11px] font-medium flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                  title="Cobalt Wash"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-700 shadow-2xs" />
                  <span>Cobalt</span>
                </button>

                <div className="w-[1px] h-3.5 bg-[var(--glass-border)] opacity-60 mx-0.5" />

                {/* Attach Thought / Marginalia Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setIsAddingMarginalia((prev) => !prev);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1 active:scale-95 transition-all cursor-pointer ${
                    isAddingMarginalia
                      ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                      : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  title="Add footnote thought"
                >
                  <MessageSquare className="w-3 h-3 stroke-[2]" />
                  <span>Note</span>
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && marginaliaInput.trim()) {
                          e.preventDefault();
                          handleApplyHighlight("graphite");
                        }
                      }}
                      placeholder="Footnote on selected text..."
                      autoFocus
                      className="w-60 px-3 py-1.5 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                    />

                    <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] px-1">
                      <span>Press enter to save</span>
                      <button
                        type="button"
                        onClick={() => handleApplyHighlight("graphite")}
                        className="px-2.5 py-0.5 rounded-lg bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-[10px] active:scale-95 transition-transform shadow-xs cursor-pointer"
                      >
                        Save ¹
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
            className="highlight-edit-popover fixed z-[9995] pointer-events-auto"
            style={{
              left: `${activePopoverPos.x}px`,
              top: `${activePopoverPos.y}px`,
              transform: activePopoverPos.placeBelow
                ? "translate(-50%, 0%)"
                : "translate(-50%, -100%)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="
                p-2 rounded-2xl bg-white/95 dark:bg-[#1c1c20]/95
                backdrop-blur-[36px] saturate-[190%] border border-[var(--glass-border)]
                shadow-[0_16px_36px_-6px_rgba(0,0,0,0.28),0_4px_12px_rgba(0,0,0,0.08)]
                flex flex-col gap-2 max-w-xs text-xs text-[var(--text-primary)]
              "
            >
              {/* Header with Style Switcher & Actions */}
              <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)]/50 pb-1.5">
                <div className="flex items-center gap-1.5 px-0.5">
                  {(["graphite", "sepia", "cobalt"] as HighlightStyle[]).map(
                    (st) => {
                      const isCurrent = activeHighlight.style === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleChangeStyle(activeHighlight, st)}
                          className="relative w-5 h-5 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer"
                          style={{
                            boxShadow: isCurrent
                              ? "0 2px 6px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.4)"
                              : "0 1px 3px rgba(0,0,0,0.1)",
                            border: isCurrent
                              ? "1.5px solid rgba(255,255,255,0.9)"
                              : "1px solid rgba(0,0,0,0.08)",
                          }}
                          title={st}
                        >
                          <div
                            className={`w-full h-full rounded-full flex items-center justify-center ${
                              st === "graphite"
                                ? "bg-stone-500"
                                : st === "sepia"
                                  ? "bg-amber-700"
                                  : "bg-blue-700"
                            }`}
                          >
                            {isCurrent && (
                              <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                            )}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      onDeleteHighlight(activeHighlight.id);
                      setActiveHighlightId(null);
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-transform cursor-pointer"
                    title="Remove Highlight"
                  >
                    <Trash2 className="w-3 h-3 stroke-[2]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHighlightId(null)}
                    className="w-6 h-6 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
                    title="Close"
                  >
                    <X className="w-3 h-3 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Edit Attached Marginalia Thought */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] uppercase font-mono text-[var(--text-tertiary)] font-semibold">
                  <PenTool className="w-2.5 h-2.5" />
                  <span>Linked Marginalia</span>
                </div>
                <input
                  type="text"
                  value={marginaliaInput}
                  onChange={(e) => setMarginaliaInput(e.target.value)}
                  placeholder="Footnote thought on this text..."
                  className="w-full px-2.5 py-1.5 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                />
                <button
                  type="button"
                  onClick={() => handleSaveActiveMarginalia(activeHighlight)}
                  className="w-full py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Update Thought</span>
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}
