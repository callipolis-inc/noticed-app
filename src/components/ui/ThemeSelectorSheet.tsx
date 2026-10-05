import { motion, AnimatePresence } from "framer-motion";
import { ThemePalette, FontChoice, TextAlign, ImageFrameSize } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Check,
} from "lucide-react";

interface ThemeSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemePalette;
  onSelectTheme: (theme: ThemePalette) => void;
  currentFont: FontChoice;
  onSelectFont: (font: FontChoice) => void;
  fontSize?: number;
  onSelectFontSize?: (size: number) => void;
  textAlign?: TextAlign;
  onSelectTextAlign?: (align: TextAlign) => void;
  imageFrameSize?: ImageFrameSize;
  onSelectImageFrameSize?: (size: ImageFrameSize) => void;
  notebookName?: string;
}

interface ThemeOption {
  id: ThemePalette;
  name: string;
  tagline: string;
  bgHex: string;
  accentHex: string;
  isDark?: boolean;
}

interface FontOption {
  id: FontChoice;
  name: string;
  shortName: string;
  fontClass: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "alabaster",
    name: "Alabaster",
    tagline: "Warm paper & matte ink",
    bgHex: "#F7F5F0",
    accentHex: "#1C1917",
    isDark: false,
  },
  {
    id: "clean_white",
    name: "Ivory",
    tagline: "Archival white sheet",
    bgHex: "#FCFCFA",
    accentHex: "#18181B",
    isDark: false,
  },
  {
    id: "sage",
    name: "Sage",
    tagline: "Kyoto matcha washi paper",
    bgHex: "#DBE6DB",
    accentHex: "#122416",
    isDark: false,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    tagline: "Monochrome dark luxury",
    bgHex: "#161618",
    accentHex: "#F5F5F4",
    isDark: true,
  },
  {
    id: "espresso",
    name: "Espresso",
    tagline: "Roasted cocoa & ink",
    bgHex: "#23201E",
    accentHex: "#EDE8E1",
    isDark: true,
  },
  {
    id: "oxford",
    name: "Oxford",
    tagline: "Archival midnight ink",
    bgHex: "#101520",
    accentHex: "#F1F5F9",
    isDark: true,
  },
];

const FONT_OPTIONS: FontOption[] = [
  {
    id: "editorial",
    name: "Newsreader",
    shortName: "Editorial",
    fontClass: "font-serif",
  },
  {
    id: "sans",
    name: "Urbanist",
    shortName: "Modern",
    fontClass: "font-sans",
  },
  {
    id: "display",
    name: "Cormorant",
    shortName: "Classic",
    fontClass: "font-display",
  },
];

export function ThemeSelectorSheet({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  currentFont,
  onSelectFont,
  fontSize = 15.5,
  onSelectFontSize,
  textAlign = "left",
  onSelectTextAlign,
  imageFrameSize = "editorial",
  onSelectImageFrameSize,
  notebookName,
}: ThemeSelectorSheetProps) {
  const handleSelectTheme = (id: ThemePalette) => {
    triggerHaptic("medium");
    onSelectTheme(id);
  };

  const handleSelectFont = (fontId: FontChoice) => {
    triggerHaptic("medium");
    triggerSuccessHaptic();
    onSelectFont(fontId);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(e.target.value);
    if (onSelectFontSize) {
      onSelectFontSize(newSize);
    }
  };

  const handleSelectAlign = (align: TextAlign) => {
    triggerHaptic("light");
    onSelectTextAlign?.(align);
  };

  const handleSelectImageSize = (size: ImageFrameSize) => {
    triggerHaptic("light");
    onSelectImageFrameSize?.(size);
  };

  const activeThemeObj =
    THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:p-4 pointer-events-none">
          {/* Subtle Ambient Dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 backdrop-blur-[6px] pointer-events-auto"
          />

          {/* Bottom Floating Liquid Glass Island */}
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="
              pointer-events-auto relative w-full max-w-sm sm:max-w-md
              dynamic-island-shell overflow-hidden z-10 flex flex-col
              shadow-[0_24px_50px_-12px_rgba(0,0,0,0.22),0_8px_20px_-4px_rgba(0,0,0,0.1)]
            "
            style={{
              marginBottom:
                "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)",
              maxHeight:
                "calc(100dvh - max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px) - 24px)",
            }}
          >
            {/* Top Specular Rim Reflection */}
            <div className="dynamic-island-specular-rim" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--glass-border)]/40 shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                  Appearance
                </span>
                {notebookName && (
                  <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[140px]">
                    · {notebookName}
                  </span>
                )}
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

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
              {/* Group 1: Theme Swatches */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Theme
                </span>

                <div className="p-3.5 rounded-2xl apple-card shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      {activeThemeObj.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                      {activeThemeObj.tagline}
                    </div>
                  </div>

                  {/* Soft Jewel Discs with Check Icon */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {THEME_OPTIONS.map((th) => {
                      const isSelected = currentTheme === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => handleSelectTheme(th.id)}
                          className="relative w-6.5 h-6.5 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer group"
                          style={{
                            backgroundColor: th.bgHex,
                            boxShadow: isSelected
                              ? "0 4px 12px -1px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.4)"
                              : "0 2px 6px -1px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.35)",
                            border: isSelected
                              ? "1.5px solid rgba(255, 255, 255, 0.9)"
                              : "1px solid rgba(0, 0, 0, 0.08)",
                          }}
                          title={th.name}
                          aria-label={th.name}
                        >
                          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/10 pointer-events-none" />
                          {isSelected && (
                            <Check
                              className={`w-3.5 h-3.5 stroke-[2.8] relative z-10 transition-transform scale-100 ${
                                th.isDark ? "text-white" : "text-neutral-800"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Group 2: Typeface Selection */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Typography
                </span>

                <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {/* Font Cards */}
                  <div className="p-3 grid grid-cols-3 gap-2">
                    {FONT_OPTIONS.map((font) => {
                      const isSelected = currentFont === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => handleSelectFont(font.id)}
                          className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-200 active:scale-95 ${
                            isSelected
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-[0_3px_10px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.25)]"
                              : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-xs"
                          }`}
                        >
                          <span
                            className={`text-lg font-bold leading-none ${font.fontClass}`}
                          >
                            Aa
                          </span>
                          <span className="text-[10px] font-medium tracking-tight mt-0.5">
                            {font.shortName}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Font Size Slider */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Size
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-secondary)] font-medium">
                        {fontSize}px
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-serif font-bold text-[var(--text-tertiary)]">
                        A
                      </span>
                      <input
                        type="range"
                        min="13"
                        max="20"
                        step="0.5"
                        value={fontSize}
                        onChange={handleSliderChange}
                        className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 accent-[var(--text-primary)] cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] focus:outline-none"
                      />
                      <span className="text-base font-serif font-bold text-[var(--text-primary)]">
                        A
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 3: Layout & Media */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Layout
                </span>

                <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {/* Paragraph Alignment */}
                  {onSelectTextAlign && (
                    <div className="p-3 flex items-center justify-between">
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        Align
                      </div>

                      <div className="p-1 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] flex items-center gap-1">
                        {(
                          [
                            { id: "left", label: "Left", icon: AlignLeft },
                            {
                              id: "center",
                              label: "Center",
                              icon: AlignCenter,
                            },
                            { id: "right", label: "Right", icon: AlignRight },
                            {
                              id: "justify",
                              label: "Justify",
                              icon: AlignJustify,
                            },
                          ] as const
                        ).map((item) => {
                          const Icon = item.icon;
                          const active = textAlign === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectAlign(item.id)}
                              className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                                active
                                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]"
                                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                              }`}
                              title={item.label}
                            >
                              <Icon className="w-3.5 h-3.5 stroke-[2]" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Image Frame Scale */}
                  {onSelectImageFrameSize && (
                    <div className="p-3 flex items-center justify-between">
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        Frame
                      </div>

                      <div className="p-1 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] flex items-center gap-1">
                        {(
                          [
                            { id: "compact", label: "Compact" },
                            { id: "editorial", label: "Editorial" },
                            { id: "full", label: "Full" },
                          ] as const
                        ).map((item) => {
                          const active = imageFrameSize === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectImageSize(item.id)}
                              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                                active
                                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] font-semibold"
                                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
