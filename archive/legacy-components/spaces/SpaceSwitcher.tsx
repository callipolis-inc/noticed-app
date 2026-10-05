import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space, CoverStyle } from "@/types";
import { triggerHaptic } from "@/lib/haptics";
import {
  ChevronDown,
  Plus,
  Users,
  BookOpen,
  Coffee,
  Compass,
  LayoutGrid,
  List,
  HeartHandshake,
  X,
} from "lucide-react";
import { NotebookCover } from "./NotebookCover";
import { SpacePairingSheet } from "./SpacePairingSheet";

interface SpaceSwitcherProps {
  spaces: Space[];
  activeSpaceId: string;
  notesCountMap?: Record<string, number>;
  onSelectSpace: (spaceId: string) => void;
  onCreateSpace: (
    name: string,
    isShared: boolean,
    coverStyle?: CoverStyle,
  ) => void;
  onUpdateSpace?: (updated: Space) => void;
}

export function SpaceSwitcher({
  spaces,
  activeSpaceId,
  notesCountMap = {},
  onSelectSpace,
  onCreateSpace,
  onUpdateSpace,
}: SpaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"shelf" | "list">("shelf");
  const [newSpaceName, setNewSpaceName] = useState("");
  const [isSharedToggle, setIsSharedToggle] = useState(false);
  const [selectedCoverStyle, setSelectedCoverStyle] =
    useState<CoverStyle>("kraft");
  const [pairingSpace, setPairingSpace] = useState<Space | null>(null);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  const getSpaceIcon = (iconName: string) => {
    switch (iconName) {
      case "coffee":
        return <Coffee className="w-3.5 h-3.5" strokeWidth={1.75} />;
      case "compass":
        return <Compass className="w-3.5 h-3.5" strokeWidth={1.75} />;
      case "users":
        return <Users className="w-3.5 h-3.5" strokeWidth={1.75} />;
      default:
        return <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />;
    }
  };

  const handleSelect = (id: string) => {
    triggerHaptic("light");
    onSelectSpace(id);
    setIsOpen(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    triggerHaptic("medium");
    onCreateSpace(newSpaceName.trim(), isSharedToggle, selectedCoverStyle);
    setNewSpaceName("");
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Sleek Pill Header Trigger */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          setIsOpen(true);
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full inner-pseudo-glass hover:opacity-95 active:scale-95 transition-all text-xs font-medium text-[var(--text-primary)] cursor-pointer shadow-xs"
      >
        <span className="text-[var(--text-secondary)]">
          {activeSpace ? (
            getSpaceIcon(activeSpace.iconName)
          ) : (
            <BookOpen className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="font-sans font-semibold tracking-tight">
          {activeSpace?.name || "All Notebooks"}
        </span>
        {activeSpace?.isShared && (
          <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-secondary)] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono">
            <Users className="w-2.5 h-2.5" />
            {activeSpace.membersCount || 2}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)] opacity-70" />
      </button>

      {/* Floating Apple Liquid Glass Spaces Sheet */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={() => {
                triggerHaptic("light");
                setIsOpen(false);
                setIsCreating(false);
              }}
              className="fixed inset-0 bg-black/35 backdrop-blur-[6px] pointer-events-auto"
            />

            {/* Top Floating Island */}
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
              {/* Top Specular Rim */}
              <div className="dynamic-island-specular-rim" />

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--glass-border)]/40 shrink-0 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                    {isCreating ? "New Notebook" : "Notebooks"}
                  </span>
                  {!isCreating && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      · {spaces.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isCreating && (
                    <div className="apple-segmented-track !p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setViewMode("shelf");
                        }}
                        className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          viewMode === "shelf"
                            ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                        title="Shelf View"
                      >
                        <LayoutGrid className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setViewMode("list");
                        }}
                        className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          viewMode === "list"
                            ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                        title="List View"
                      >
                        <List className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setIsOpen(false);
                      setIsCreating(false);
                    }}
                    className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
                {!isCreating ? (
                  <>
                    {/* Unified Stream Card */}
                    <button
                      type="button"
                      onClick={() => handleSelect("all")}
                      className={`
                        w-full flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all text-left
                        ${
                          activeSpaceId === "all"
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-md"
                            : "apple-card hover:opacity-95 text-[var(--text-primary)] shadow-[0_4px_14px_-2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]"
                        }
                      `}
                    >
                      <span className="flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 stroke-[2]" />
                        <span className="text-xs font-semibold tracking-tight">
                          All Field Notes
                        </span>
                      </span>
                      <span className="font-mono text-[11px] opacity-75 font-medium">
                        {Object.values(notesCountMap).reduce(
                          (a, b) => a + b,
                          0,
                        )}{" "}
                        total
                      </span>
                    </button>

                    {/* SHELF VIEW */}
                    {viewMode === "shelf" && (
                      <div className="grid grid-cols-2 gap-3.5 pt-1">
                        {spaces.map((space) => {
                          const isSelected = space.id === activeSpaceId;
                          const count = notesCountMap[space.id] || 0;
                          return (
                            <div
                              key={space.id}
                              onClick={() => handleSelect(space.id)}
                              className="flex flex-col items-center cursor-pointer group"
                            >
                              <div className="w-full relative">
                                <NotebookCover
                                  name={space.name}
                                  coverStyle={space.coverStyle || "kraft"}
                                  customColor={space.customColor}
                                  isSelected={isSelected}
                                  noteCount={count}
                                />

                                {space.isShared && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerHaptic("light");
                                      setPairingSpace(space);
                                    }}
                                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-xs"
                                    title="Cozy Stash Info"
                                  >
                                    <HeartHandshake className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* New Book Card Button */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setIsCreating(true);
                          }}
                          className="
                            aspect-[3/4.15] w-full rounded-2xl border-2 border-dashed border-[var(--glass-border)]
                            flex flex-col items-center justify-center gap-1.5 text-[var(--text-tertiary)]
                            hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/40
                            active:scale-95 transition-all inner-pseudo-glass cursor-pointer
                          "
                        >
                          <Plus className="w-5 h-5 stroke-[2]" />
                          <span className="text-[11px] font-semibold">
                            New Book
                          </span>
                        </button>
                      </div>
                    )}

                    {/* LIST VIEW */}
                    {viewMode === "list" && (
                      <div className="space-y-1.5">
                        <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                          {spaces.map((space) => {
                            const isSelected = space.id === activeSpaceId;
                            const count = notesCountMap[space.id] || 0;
                            return (
                              <div
                                key={space.id}
                                onClick={() => handleSelect(space.id)}
                                className={`
                                  p-3 flex items-center justify-between cursor-pointer transition-colors
                                  ${isSelected ? "bg-[var(--text-primary)]/8" : "hover:bg-[var(--text-primary)]/3"}
                                `}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                                    {getSpaceIcon(space.iconName)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                      {space.name}
                                    </div>
                                    <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                                      {space.description || `${count} notes`}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-[10.5px] text-[var(--text-secondary)]">
                                    {count}n
                                  </span>
                                  {space.isShared && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic("light");
                                        setPairingSpace(space);
                                      }}
                                      className="p-1 rounded-full inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                      title="Cozy Stash pairing"
                                    >
                                      <HeartHandshake className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setIsCreating(true);
                          }}
                          className="w-full p-2.5 rounded-2xl inner-pseudo-glass border border-dashed border-[var(--glass-border)] flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer mt-2"
                        >
                          <Plus className="w-4 h-4 stroke-[2]" />
                          <span>Create Notebook</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* CREATE FORM */
                  <form
                    onSubmit={handleCreateSubmit}
                    className="space-y-3.5 pt-1"
                  >
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[var(--text-tertiary)] px-1">
                        Notebook Title
                      </label>
                      <input
                        type="text"
                        value={newSpaceName}
                        onChange={(e) => setNewSpaceName(e.target.value)}
                        placeholder="e.g. Kyoto Trip, Morning Pages"
                        autoFocus
                        className="w-full px-3.5 py-2 rounded-xl apple-card text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                      />
                    </div>

                    {/* Cover Palette Pills */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[var(--text-tertiary)] px-1">
                        Cover Palette
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: "kraft", label: "Terracotta" },
                            { id: "marble", label: "Pine" },
                            { id: "klein", label: "Cobalt" },
                            { id: "electric", label: "Indigo" },
                            { id: "alabaster", label: "Linen" },
                            { id: "obsidian", label: "Obsidian" },
                          ] as const
                        ).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic("light");
                              setSelectedCoverStyle(c.id);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-medium text-center transition-all cursor-pointer ${
                              selectedCoverStyle === c.id
                                ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs"
                                : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shared Space iOS Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl apple-card shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          Shared Cozy Stash
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          Collaborate with partner or friend
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setIsSharedToggle(!isSharedToggle);
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ${
                          isSharedToggle
                            ? "bg-[var(--text-primary)]"
                            : "bg-neutral-300 dark:bg-neutral-700"
                        }`}
                        role="switch"
                        aria-checked={isSharedToggle}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] transform transition-transform duration-200 ${
                            isSharedToggle ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="flex-1 py-2.5 rounded-full inner-pseudo-glass text-xs font-medium text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newSpaceName.trim()}
                        className="flex-1 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold disabled:opacity-40 active:scale-95 transition-transform shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cozy Stash Pairing Modal */}
      <SpacePairingSheet
        isOpen={Boolean(pairingSpace)}
        onClose={() => setPairingSpace(null)}
        space={pairingSpace}
        onUpdateSpace={(updated) => {
          if (onUpdateSpace) onUpdateSpace(updated);
          setPairingSpace(null);
        }}
      />
    </>
  );
}
