import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { ThemePalette } from "@/types";
import {
  X,
  Trash2,
  AlertTriangle,
  Smartphone,
  Palette,
  BookOpen,
  Check,
  Sparkles,
  Type,
} from "lucide-react";
import { useProStatus, setProUser } from "@/lib/proManager";
import { AtelierProModal } from "./AtelierProModal";

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultShelfLayout: "spines" | "covers";
  onUpdateDefaultShelfLayout: (layout: "spines" | "covers") => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (enabled: boolean) => void;
  onResetAllData: () => void;
  currentTheme?: ThemePalette;
  onSelectTheme?: (theme: ThemePalette) => void;
  fontSize?: number;
  onSelectFontSize?: (size: number) => void;
}

const FONT_SIZE_PRESETS = [
  { label: "Small", size: 14 },
  { label: "Default", size: 15.5 },
  { label: "Large", size: 17.5 },
  { label: "Max", size: 19.5 },
] as const;

export function SettingsSheet({
  isOpen,
  onClose,
  defaultShelfLayout,
  onUpdateDefaultShelfLayout,
  hapticsEnabled,
  onToggleHaptics,
  onResetAllData,
  currentTheme,
  onSelectTheme,
  fontSize = 15.5,
  onSelectFontSize,
}: SettingsSheetProps) {
  // Danger Zone Confirmation Modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const isPro = useProStatus();
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  const handleConfirmReset = () => {
    if (confirmInput.toUpperCase() === "RESET") {
      triggerSuccessHaptic();
      setIsResetConfirmOpen(false);
      setConfirmInput("");
      onResetAllData();
      onClose();
    }
  };

  const themeOptions: Array<{
    id: ThemePalette;
    name: string;
    bg: string;
    isDark?: boolean;
  }> = [
    { id: "alabaster", name: "Alabaster", bg: "#F7F5F0", isDark: false },
    { id: "clean_white", name: "Ivory", bg: "#FCFCFA", isDark: false },
    { id: "sage", name: "Sage", bg: "#DBE6DB", isDark: false },
    { id: "obsidian", name: "Obsidian", bg: "#161618", isDark: true },
    { id: "espresso", name: "Espresso", bg: "#23201E", isDark: true },
    { id: "oxford", name: "Oxford", bg: "#101520", isDark: true },
  ];

  const currentThemeLabel =
    themeOptions.find((t) => t.id === currentTheme)?.name || "Alabaster";

  const activeSizeLabel =
    FONT_SIZE_PRESETS.find((p) => Math.abs(p.size - fontSize) < 0.25)?.label ||
    "Custom";
  const scalePercent = Math.round((fontSize / 15.5) * 100);

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

          {/* Top Floating Liquid Glass Island */}
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="
              pointer-events-auto relative w-full max-w-sm sm:max-w-md
              dynamic-island-shell overflow-hidden z-10 flex flex-col
              shadow-[0_24px_50px_-12px_rgba(0,0,0,0.18),0_8px_20px_-4px_rgba(0,0,0,0.08)]
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
              <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                Settings
              </span>

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

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
              {/* Group 1: Appearance */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Appearance
                </span>

                <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {/* Theme Palette Row */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                          <Palette className="w-3.5 h-3.5 opacity-80" />
                        </div>
                        <span>Theme</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] pl-8">
                        {currentThemeLabel}
                      </div>
                    </div>

                    {/* Apple Jewel Discs with Soft Detailing */}
                    <div className="flex items-center gap-2 shrink-0">
                      {themeOptions.map((th) => {
                        const isSelected =
                          (currentTheme || "alabaster") === th.id;
                        return (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic("medium");
                              onSelectTheme?.(th.id);
                            }}
                            className="relative w-6.5 h-6.5 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer group"
                            style={{
                              backgroundColor: th.bg,
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
                            {/* Inner Specular Glare */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/10 pointer-events-none" />

                            {/* Crisp Minimal Check Icon on Selected */}
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

                  {/* Shelf Layout Row */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                          <BookOpen className="w-3.5 h-3.5 opacity-80" />
                        </div>
                        <span>Shelf Layout</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] pl-8">
                        Default display
                      </div>
                    </div>

                    {/* Tactile Segmented Control */}
                    <div className="p-1 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          onUpdateDefaultShelfLayout("spines");
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                          defaultShelfLayout === "spines"
                            ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_8px_-1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] font-semibold"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        Spines
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          onUpdateDefaultShelfLayout("covers");
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                          defaultShelfLayout === "covers"
                            ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_8px_-1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] font-semibold"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        Covers
                      </button>
                    </div>
                  </div>

                  {/* Text Size Preference Row */}
                  {onSelectFontSize && (
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                              <Type className="w-3.5 h-3.5 opacity-80" />
                            </div>
                            <span>Text Size</span>
                          </div>
                          <div className="text-[10px] text-[var(--text-tertiary)] pl-8">
                            {activeSizeLabel} · {scalePercent}% ({fontSize}px)
                          </div>
                        </div>

                        {/* Quick Segmented Presets */}
                        <div className="p-1 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--glass-border)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] flex items-center gap-0.5">
                          {FONT_SIZE_PRESETS.map((preset) => {
                            const isActive =
                              Math.abs(fontSize - preset.size) < 0.25;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  triggerHaptic("light");
                                  onSelectFontSize(preset.size);
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10.5px] font-medium transition-all duration-200 cursor-pointer ${
                                  isActive
                                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_8px_-1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] font-semibold"
                                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Fine Range Slider */}
                      <div className="flex items-center gap-2.5 pl-8 pr-1 pt-0.5">
                        <span className="text-[11px] font-serif font-bold text-[var(--text-tertiary)] select-none">
                          A
                        </span>
                        <input
                          type="range"
                          min="13"
                          max="20"
                          step="0.5"
                          value={fontSize}
                          onChange={(e) => {
                            onSelectFontSize(Number(e.target.value));
                          }}
                          aria-label="Text size slider"
                          className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 accent-[var(--text-primary)] cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] focus:outline-none"
                        />
                        <span className="text-[16px] font-serif font-bold text-[var(--text-primary)] select-none">
                          A
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Group 2: Membership & Privileges */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Membership
                </span>

                <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {/* Atelier Pro Switch Row */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] text-[var(--text-primary)]">
                        <Sparkles className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>Atelier Pro</span>
                          <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono uppercase font-semibold ${
                            isPro
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)]"
                              : "inner-pseudo-glass text-[var(--text-tertiary)]"
                          }`}>
                            {isPro ? "Active" : "Standard"}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          Video captures & audio file imports
                        </div>
                      </div>
                    </div>

                    {/* Pro Toggle Switch (For testing & future monetization) */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("medium");
                        setProUser(!isPro);
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ${
                        isPro
                          ? "bg-[var(--text-primary)]"
                          : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                      role="switch"
                      aria-checked={isPro}
                      title="Toggle Atelier Pro membership status"
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)] transform transition-transform duration-200 ${
                          isPro ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Feature Showcase Link */}
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-secondary)] pl-8">
                      Privilege details
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsProModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-full inner-pseudo-glass text-[10.5px] font-medium text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer"
                    >
                      View Privileges
                    </button>
                  </div>
                </div>
              </div>

              {/* Group 3: Feedback & Haptics */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Feedback
                </span>

                <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {/* Haptics Switch Row */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                        <Smartphone className="w-3.5 h-3.5 opacity-80" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          Haptics
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          Tactile impulse feedback
                        </div>
                      </div>
                    </div>

                    {/* iOS Switch with Soft Shadow Thumb */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("medium");
                        onToggleHaptics(!hapticsEnabled);
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ${
                        hapticsEnabled
                          ? "bg-[var(--text-primary)]"
                          : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                      role="switch"
                      aria-checked={hapticsEnabled}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)] transform transition-transform duration-200 ${
                          hapticsEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Pulse Test Row */}
                  {hapticsEnabled && (
                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)] pl-8">
                        Test vibration
                      </span>
                      <button
                        type="button"
                        onClick={() => triggerSuccessHaptic()}
                        className="px-3 py-1 rounded-full inner-pseudo-glass text-[11px] font-medium text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]"
                      >
                        Pulse
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Group 3: Data Management */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("heavy");
                    setIsResetConfirmOpen(true);
                  }}
                  className="w-full p-3.5 rounded-2xl apple-card text-rose-500 hover:text-rose-600 active:scale-98 transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_20px_-4px_rgba(244,63,94,0.1),inset_0_1px_0_rgba(255,255,255,0.85)] border border-rose-500/15"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Reset All Data</span>
                </button>

                <div className="flex flex-col items-center justify-center pt-2 gap-1.5 opacity-80">
                  <img
                    src="/logo-dark.png"
                    alt="Noticed"
                    className="w-8 h-8 rounded-xl dark:block hidden shadow-xs border border-white/10 object-cover"
                  />
                  <img
                    src="/logo-light.png"
                    alt="Noticed"
                    className="w-8 h-8 rounded-xl dark:hidden block shadow-xs border border-black/5 object-cover"
                  />
                  <p className="text-[10px] font-mono text-center text-[var(--text-tertiary)]">
                    Noticed · Version 1.0.0
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sub-Modal: Reset Confirmation */}
          <AnimatePresence>
            {isResetConfirmOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="fixed inset-0 bg-black/45 backdrop-blur-md"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 8 }}
                  className="relative w-full max-w-[280px] rounded-3xl p-5 dynamic-island-shell z-10 space-y-4 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.35)]"
                >
                  <div className="dynamic-island-specular-rim" />

                  <div className="text-center space-y-1">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Reset All Data?
                    </h4>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      All volumes and notes will be lost. Type{" "}
                      <strong className="text-[var(--text-primary)]">
                        RESET
                      </strong>{" "}
                      to proceed.
                    </p>
                  </div>

                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="RESET"
                    autoFocus
                    className="w-full text-center px-3 py-1.5 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] uppercase font-mono tracking-widest focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetConfirmOpen(false);
                        setConfirmInput("");
                      }}
                      className="flex-1 py-1.5 rounded-xl inner-pseudo-glass text-xs font-medium text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer shadow-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={confirmInput.toUpperCase() !== "RESET"}
                      onClick={handleConfirmReset}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform shadow-xs cursor-pointer ${
                        confirmInput.toUpperCase() === "RESET"
                          ? "bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.3)]"
                          : "bg-[var(--text-primary)]/10 text-[var(--text-tertiary)] cursor-not-allowed"
                      }`}
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Atelier Pro Showcase Modal */}
          <AtelierProModal
            isOpen={isProModalOpen}
            onClose={() => setIsProModalOpen(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
