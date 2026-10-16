import { motion, AnimatePresence } from "framer-motion";
import { TextAlign, FontChoice } from "@/types";
import { triggerHaptic } from "@/lib/haptics";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  Minus,
} from "lucide-react";

export type RichFormatAction =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "quote"
  | "bullet"
  | "number"
  | "divider";

interface CreateNoteMarkdownToolbarProps {
  isOpen: boolean;
  fontChoice: FontChoice;
  setFontChoice: (font: FontChoice) => void;
  textAlign: TextAlign;
  setTextAlign: (align: TextAlign) => void;
  onFormatAction: (action: RichFormatAction) => void;
  formatStates?: {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    quote?: boolean;
    code?: boolean;
  };
}

export function CreateNoteMarkdownToolbar({
  isOpen,
  fontChoice,
  setFontChoice,
  textAlign,
  setTextAlign,
  onFormatAction,
  formatStates,
}: CreateNoteMarkdownToolbarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="formatting-toolbar px-4 py-2.5 border-t border-[var(--glass-border)]/50 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden shrink-0 z-10 space-y-2"
        >
          {/* Baris 1: Font Family & Paragraph Alignment */}
          <div className="flex items-center justify-between gap-2">
            {/* Font Choice */}
            <div className="apple-segmented-track p-0.5">
              {(
                [
                  { id: "editorial", label: "Serif" },
                  { id: "sans", label: "Sans" },
                  { id: "display", label: "Classic" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setFontChoice(f.id);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] transition-all cursor-pointer ${
                    fontChoice === f.id
                      ? "bg-white dark:bg-neutral-800 text-[var(--text-primary)] font-semibold shadow-xs"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Paragraph Alignment */}
            <div className="apple-segmented-track p-0.5">
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
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const isActive = textAlign === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setTextAlign(opt.id);
                    }}
                    className={`p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full transition-all cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-neutral-800 text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                    title={opt.label}
                    aria-label={`Align text ${opt.label.toLowerCase()}`}
                  >
                    <Icon className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Baris 2: Direct Inline Formatting Actions */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormatAction("bold")}
              className={`px-2.5 py-1.5 min-h-[30px] rounded-lg text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer font-bold shrink-0 ${
                formatStates?.bold
                  ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Bold (Cmd+B)"
              aria-label="Format bold"
            >
              <Bold className="w-3.5 h-3.5 stroke-[2.4]" />
              <span className="text-[11px]">Bold</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormatAction("italic")}
              className={`px-2.5 py-1.5 min-h-[30px] rounded-lg text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer italic font-serif shrink-0 ${
                formatStates?.italic
                  ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Italic (Cmd+I)"
              aria-label="Format italic"
            >
              <Italic className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="text-[11px]">Italic</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormatAction("strike")}
              className={`px-2 py-1 rounded-lg text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer line-through shrink-0 ${
                formatStates?.strike
                  ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
              }`}
              title="Strikethrough (Cmd+Shift+X)"
              aria-label="Format strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5 stroke-[2]" />
              <span className="text-[11px]">Strike</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormatAction("code")}
              className={`px-2 py-1 rounded-lg text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer font-mono shrink-0 ${
                formatStates?.code
                  ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Inline Code (Cmd+E)"
              aria-label="Insert inline code"
            >
              <Code className="w-3.5 h-3.5 stroke-[2]" />
              <span className="text-[11px]">Code</span>
            </button>

            <div className="w-px h-3.5 bg-[var(--glass-border)] mx-1 shrink-0" />

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormatAction("quote")}
              className={`px-2 py-1 rounded-lg text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                formatStates?.quote
                  ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Quote block"
              aria-label="Insert quote block"
            >
              <Quote className="w-3.5 h-3.5 stroke-[2]" />
              <span className="text-[11px]">Quote</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormatAction("bullet")}
              className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Bullet list"
              aria-label="Insert bullet list"
            >
              <List className="w-3.5 h-3.5 stroke-[2]" />
              <span className="text-[11px]">Bullet</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormatAction("number")}
              className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Numbered list"
              aria-label="Insert numbered list"
            >
              <ListOrdered className="w-3.5 h-3.5 stroke-[2]" />
              <span className="text-[11px]">Number</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormatAction("divider")}
              className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Horizontal divider"
              aria-label="Insert horizontal divider"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="text-[11px]">Divider</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
