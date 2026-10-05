import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space, CoverStyle, FontChoice } from "@/types";
import {
  BookshelfSpine,
  getCoverPalette,
  SpineMotifGlyph,
  getLuminance,
} from "./BookshelfSpine";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  Settings,
  BookOpen,
  Sparkles,
  Pipette,
  Columns3,
  LayoutGrid,
  Check,
} from "lucide-react";

export interface BookshelfViewProps {
  spaces: Space[];
  activeSpaceId: string;
  notesCountMap: Record<string, number>;
  userName?: string;
  avatarPhoto?: string | null;
  defaultShelfLayout?: "spines" | "covers";
  onSelectSpace: (spaceId: string) => void;
  onBackToNotebook?: () => void;
  onCreateSpace: (
    name: string,
    isShared: boolean,
    coverStyle?: CoverStyle,
    description?: string,
    customColor?: string,
  ) => void;
  onUpdateSpace?: (space: Space) => void;
  onDeleteSpace?: (spaceId: string) => void;
  onReorderSpaces?: (newSpaces: Space[]) => void;
  onOpenThemeSelector?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenSearch?: () => void;
}

export const MODERN_PALETTES: {
  id: CoverStyle;
  name: string;
  color: string;
  desc: string;
}[] = [
  {
    id: "klein",
    name: "Cobalt Royal",
    color: "#1d4ed8",
    desc: "Rich archival cobalt blue",
  },
  {
    id: "alabaster",
    name: "Cream Linen",
    color: "#f3eee4",
    desc: "Cream paper with royal cobalt foil",
  },
  {
    id: "electric",
    name: "Electric Indigo",
    color: "#4338ca",
    desc: "Electric indigo velvet",
  },
  {
    id: "marble",
    name: "Forest Pine",
    color: "#1b3a2a",
    desc: "Botanical deep evergreen leather",
  },
  {
    id: "kraft",
    name: "Terracotta Rust",
    color: "#9a3f24",
    desc: "Warm Italian sienna amber",
  },
  {
    id: "obsidian",
    name: "Obsidian Velvet",
    color: "#141416",
    desc: "Deep monochrome night",
  },
];

function LiveSpinePreview({
  title,
  coverStyle,
  customColor,
  fontChoice,
}: {
  title: string;
  coverStyle: CoverStyle;
  customColor?: string;
  fontChoice?: FontChoice;
}) {
  const { color, foil, motif } = getCoverPalette(
    coverStyle,
    customColor,
    title,
  );
  const displayTitle = title.trim() || "Untitled";
  const isLight = getLuminance(color) > 0.6;

  const getFontFamily = () => {
    switch (fontChoice) {
      case "sans":
        return "var(--font-sans, sans-serif)";
      case "display":
        return "var(--font-display, serif)";
      case "editorial":
      default:
        return "var(--font-serif, Georgia, serif)";
    }
  };

  return (
    <div className="w-full h-28 rounded-2xl apple-card flex items-center justify-center relative overflow-hidden shrink-0 select-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
      <div
        className="w-10 h-24 rounded-t-[6px] rounded-b-[4px] relative overflow-hidden flex flex-col items-center justify-between py-2 transition-all duration-300"
        style={{
          backgroundColor: color,
          boxShadow:
            "0 6px 14px -2px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -1.5px 1.5px rgba(0,0,0,0.4), inset 1.5px 0 2px rgba(255,255,255,0.1), inset -1.5px 0 2px rgba(0,0,0,0.3)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-16 mix-blend-overlay"
          style={{
            backgroundImage: `
              radial-gradient(rgba(255,255,255,0.7) 15%, transparent 20%),
              radial-gradient(rgba(0,0,0,0.7) 15%, transparent 20%)
            `,
            backgroundSize: "2px 2px",
            backgroundPosition: "0 0, 1px 1px",
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.18) 7%, rgba(0,0,0,0.0) 20%, rgba(255,255,255,0.05) 38%, rgba(0,0,0,0.0) 58%, rgba(0,0,0,0.16) 82%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        <div
          className="absolute top-0 bottom-0 left-[2px] w-[1px] pointer-events-none z-10 opacity-75"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.12) 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-[2px] w-[1px] pointer-events-none z-10 opacity-75"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.45) 100%)",
          }}
        />

        <div
          className="w-4 h-[1.25px] rounded-full shrink-0 z-10 opacity-80"
          style={{
            backgroundColor: foil,
            boxShadow: isLight
              ? "0 -0.5px 0.5px rgba(0,0,0,0.3), 0 0.5px 0.5px rgba(255,255,255,0.7)"
              : "0 -0.5px 0.5px rgba(0,0,0,0.6), 0 0.5px 0.5px rgba(255,255,255,0.2)",
          }}
        />

        <div className="z-10 flex-1 flex items-center justify-center py-1 overflow-hidden px-0.5 my-1">
          <span
            className="text-[10px] tracking-tight font-semibold whitespace-nowrap truncate max-h-[60px]"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              color: foil,
              fontFamily: getFontFamily(),
              textShadow: isLight
                ? "0 -0.5px 0.5px rgba(0,0,0,0.35), 0 0.5px 0.5px rgba(255,255,255,0.85)"
                : "0 -0.5px 0.5px rgba(0,0,0,0.7), 0 0.5px 0.5px rgba(255,255,255,0.2)",
            }}
          >
            {displayTitle}
          </span>
        </div>

        <div className="z-10 flex flex-col items-center gap-1 shrink-0">
          <div
            className="opacity-90 scale-90"
            style={{
              filter: isLight
                ? "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.3)) drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.7))"
                : "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.6)) drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.2))",
            }}
          >
            <SpineMotifGlyph motif={motif} foil={foil} />
          </div>
          <div
            className="w-4 h-[1.25px] rounded-full shrink-0 opacity-80"
            style={{
              backgroundColor: foil,
              boxShadow: isLight
                ? "0 -0.5px 0.5px rgba(0,0,0,0.3), 0 0.5px 0.5px rgba(255,255,255,0.7)"
                : "0 -0.5px 0.5px rgba(0,0,0,0.6), 0 0.5px 0.5px rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </div>

      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full inner-pseudo-glass text-[8.5px] font-medium text-[var(--text-tertiary)] flex items-center gap-1 shadow-xs">
        <Sparkles className="w-2.5 h-2.5 text-[var(--text-secondary)]" />
        <span>Live Spine</span>
      </div>
    </div>
  );
}

export function BookshelfView({
  spaces,
  activeSpaceId,
  notesCountMap,
  userName = "Afa",
  avatarPhoto,
  defaultShelfLayout = "spines",
  onSelectSpace,
  onCreateSpace,
  onUpdateSpace,
  onDeleteSpace,
  onReorderSpaces,
  onOpenThemeSelector: _onOpenThemeSelector,
  onOpenProfile,
  onOpenSettings,
  onOpenSearch: _onOpenSearch,
}: BookshelfViewProps) {
  const currentAvatar =
    avatarPhoto ??
    (typeof window !== "undefined"
      ? localStorage.getItem("sidenotes_avatar_photo")
      : null);
  const [selectedId, setSelectedId] = useState<string>(activeSpaceId);
  const [isOpening, setIsOpening] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shelfLayout, setShelfLayout] = useState<"spines" | "covers">(
    defaultShelfLayout,
  );

  const carouselRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Edit State
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCover, setEditCover] = useState<CoverStyle>("klein");
  const [editFont, setEditFont] = useState<FontChoice>("editorial");
  const [editCustomColor, setEditCustomColor] = useState<string | undefined>(
    undefined,
  );
  const [editShared, setEditShared] = useState(false);

  // Create State
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCover, setNewCover] = useState<CoverStyle>("klein");
  const [newCustomColor, setNewCustomColor] = useState<string | undefined>(
    undefined,
  );
  const [newShared, setNewShared] = useState(false);

  const activeSelected = useMemo(() => {
    return (
      spaces.find((s) => s.id === selectedId) ||
      spaces.find((s) => s.id === activeSpaceId) ||
      spaces[0]
    );
  }, [spaces, selectedId, activeSpaceId]);

  const activeIndex = useMemo(() => {
    return spaces.findIndex((s) => s.id === activeSelected?.id);
  }, [spaces, activeSelected]);

  // Center active book smoothly when selectedId changes
  useEffect(() => {
    if (shelfLayout === "covers" && activeSelected) {
      const el = itemRefs.current.get(activeSelected.id);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [selectedId, shelfLayout, activeSelected]);

  const handleSelectBook = (id: string) => {
    if (isOpening) return;
    triggerHaptic("light");
    setSelectedId(id);
  };

  const handleOpenActive = () => {
    if (!activeSelected || isOpening) return;
    triggerHaptic("medium");
    setIsOpening(true);

    setTimeout(() => {
      onSelectSpace(activeSelected.id);
      setIsOpening(false);
    }, 580);
  };

  const handleStartEdit = () => {
    if (!activeSelected) return;
    triggerHaptic("light");
    setEditName(activeSelected.name);
    setEditDesc(activeSelected.description || "");
    setEditCover(activeSelected.coverStyle || "klein");
    setEditFont(activeSelected.fontChoice || "editorial");
    setEditCustomColor(activeSelected.customColor);
    setEditShared(activeSelected.isShared || false);
    setIsEditing(true);
  };

  const handleMoveSpace = (direction: "left" | "right") => {
    if (!activeSelected || !onReorderSpaces || spaces.length <= 1) return;
    const currentIndex = spaces.findIndex((s) => s.id === activeSelected.id);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= spaces.length) return;

    triggerHaptic("medium");
    const newSpaces = [...spaces];
    const [moved] = newSpaces.splice(currentIndex, 1);
    newSpaces.splice(targetIndex, 0, moved);
    onReorderSpaces(newSpaces);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !activeSelected) return;
    triggerSuccessHaptic();

    if (onUpdateSpace) {
      onUpdateSpace({
        ...activeSelected,
        name: editName.trim(),
        description: editDesc.trim(),
        coverStyle: editCover,
        fontChoice: editFont,
        customColor: editCustomColor,
        isShared: editShared,
      });
    }

    setIsEditing(false);
  };

  const handleDeleteActive = () => {
    if (!activeSelected || spaces.length <= 1) return;
    if (
      window.confirm(
        `Archive and remove "${activeSelected.name}" from bookshelf?`,
      )
    ) {
      triggerHaptic("heavy");
      if (onDeleteSpace) {
        onDeleteSpace(activeSelected.id);
      }
      setIsEditing(false);
      setSelectedId(spaces.find((s) => s.id !== activeSelected.id)?.id || "");
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    triggerSuccessHaptic();
    onCreateSpace(
      newName.trim(),
      newShared,
      newCover,
      newDesc.trim(),
      newCustomColor,
    );
    setNewName("");
    setNewDesc("");
    setNewCustomColor(undefined);
    setIsCreating(false);
  };

  const selectedPalette = getCoverPalette(
    activeSelected?.coverStyle || "klein",
    activeSelected?.customColor,
  );

  return (
    <div
      className="min-h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col justify-between overflow-x-hidden relative select-none"
      style={{
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)",
        paddingBottom:
          "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 24px)",
      }}
    >
      {/* 1. TOP FLOATING LIQUID GLASS BAR */}
      <header className="px-5 pb-2 flex items-center justify-between z-40 max-w-md mx-auto w-full">
        {/* Profile Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenProfile?.();
          }}
          className="flex items-center gap-2 p-1 pl-1 pr-3.5 rounded-full dynamic-island-shell cursor-pointer hover:opacity-95 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] border border-[var(--glass-border)]"
          title="Profile"
        >
          <div className="dynamic-island-specular-rim" />
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt={userName}
              className="w-7 h-7 rounded-full object-cover shadow-xs border border-white/40 dark:border-white/10"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] font-bold text-xs flex items-center justify-center font-sans shadow-xs">
              {userName.charAt(0).toUpperCase() || "A"}
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-[11.5px] font-semibold leading-none text-[var(--text-primary)] font-sans">
              {userName}
            </span>
            <span className="text-[9.5px] text-[var(--text-tertiary)] font-medium leading-none mt-0.5 font-sans">
              Atelier
            </span>
          </div>
        </button>

        {/* Right Actions Pod */}
        <div className="flex items-center p-1 rounded-full dynamic-island-shell shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] border border-[var(--glass-border)] gap-1">
          <div className="dynamic-island-specular-rim" />

          {/* Segmented Layout Switcher */}
          <div className="apple-segmented-track !p-0.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setShelfLayout("spines");
              }}
              className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                shelfLayout === "spines"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
              title="Spines View"
            >
              <Columns3 className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setShelfLayout("covers");
              }}
              className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                shelfLayout === "covers"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
              title="Covers View"
            >
              <LayoutGrid className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>

          <div className="w-[1px] h-3.5 bg-[var(--glass-border)] opacity-60" />

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenSettings();
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 stroke-[1.85]" />
            </button>
          )}

          <div className="w-[1px] h-3.5 bg-[var(--glass-border)] opacity-60" />

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsCreating(true);
            }}
            className="w-7 h-7 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] flex items-center justify-center active:scale-90 hover:opacity-90 transition-transform shadow-xs cursor-pointer"
            title="New Notebook"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* 2. MAIN HORIZON DISPLAY: SPINES OR UNCONSTRAINED 3D SPATIAL CAROUSEL */}
      <main className="flex-1 flex flex-col justify-center items-center relative scene-3d w-full my-auto overflow-visible">
        {shelfLayout === "spines" ? (
          /* SPINES MODE (Contained) */
          <div className="w-full max-w-md px-4 mx-auto flex flex-col items-center justify-center my-auto">
            <div className="relative w-full flex items-end justify-center overflow-x-auto no-scrollbar pt-10 pb-0 px-2 z-20">
              <div className="flex items-end justify-center min-w-full shrink-0">
                {spaces.map((space) => {
                  const isSelected = space.id === activeSelected?.id;
                  const count = notesCountMap[space.id] || 0;

                  return (
                    <BookshelfSpine
                      key={space.id}
                      space={space}
                      noteCount={count}
                      isSelected={isSelected}
                      onSelect={() => handleSelectBook(space.id)}
                      onOpen={handleOpenActive}
                    />
                  );
                })}
              </div>
            </div>

            {/* Liquid Glass Pedestal Shelf */}
            <div className="w-full px-2 z-10 -mt-[1px]">
              <div className="w-full h-8 rounded-2xl dynamic-island-shell border border-[var(--glass-border)] relative shadow-[0_16px_36px_-6px_rgba(0,0,0,0.22)] flex items-center justify-between px-3.5 overflow-hidden backdrop-blur-2xl">
                <div className="dynamic-island-specular-rim" />

                <div className="flex items-center gap-1.5 text-[9.5px] text-[var(--text-secondary)] font-mono uppercase tracking-widest font-semibold">
                  <BookOpen className="w-3 h-3 text-[var(--text-tertiary)]" />
                  <span>{spaces.length} Editions</span>
                </div>

                <span className="text-[9.5px] text-[var(--text-tertiary)] font-mono uppercase tracking-widest">
                  {Object.values(notesCountMap).reduce((a, b) => a + b, 0)}{" "}
                  Notices
                </span>
              </div>
            </div>

            {/* Typographic Metadata & Actions */}
            {activeSelected && (
              <div className="w-full mt-5 text-center flex flex-col items-center px-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] font-semibold">
                    {activeSelected.isShared ? "Shared" : "Personal"}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] opacity-40">
                    •
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] font-medium">
                    {notesCountMap[activeSelected.id] || 0} notices
                  </span>
                </div>

                <h2
                  onClick={handleOpenActive}
                  className="text-2xl font-serif font-bold text-[var(--text-primary)] tracking-tight cursor-pointer hover:opacity-85 active:scale-98 transition-all truncate max-w-full"
                >
                  {activeSelected.name}
                </h2>

                {activeSelected.description && (
                  <p className="text-xs text-[var(--text-secondary)] italic mt-1.5 max-w-xs line-clamp-2 opacity-80">
                    {activeSelected.description}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="h-9 px-4 rounded-full inner-pseudo-glass text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform cursor-pointer"
                    title="Edit Notebook"
                  >
                    <Pencil className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    disabled={isOpening}
                    onClick={handleOpenActive}
                    className="h-9 px-5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold tracking-wide flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.18)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <span>{isOpening ? "Opening..." : "Open Notebook"}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* COVERS MODE: UNCONSTRAINED EDGE-TO-EDGE 3D SPATIAL CAROUSEL */
          <div className="w-full flex-1 flex flex-col justify-center items-center my-auto z-20 py-2">
            {/* Viewport Track membentang penuh ke tepi layar ponsel tanpa terpotong max-w-md */}
            <div
              ref={carouselRef}
              className="w-full overflow-x-auto no-scrollbar py-6 flex items-center gap-5 sm:gap-6 snap-x snap-mandatory px-[calc(50%-82px)] [perspective:1400px]"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
              }}
            >
              {spaces.map((space, idx) => {
                const isSelected = space.id === activeSelected?.id;
                const offset = idx - activeIndex;
                const count = notesCountMap[space.id] || 0;
                const { color, foil, motif } = getCoverPalette(
                  space.coverStyle || "klein",
                  space.customColor,
                  space.name,
                );
                const isLight = getLuminance(color) > 0.6;

                return (
                  <div
                    key={space.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(space.id, el);
                      else itemRefs.current.delete(space.id);
                    }}
                    onClick={() => {
                      if (isSelected) {
                        handleOpenActive();
                      } else {
                        handleSelectBook(space.id);
                      }
                    }}
                    className="snap-center shrink-0 cursor-pointer select-none transition-transform duration-300 ease-out flex flex-col items-center"
                    style={{
                      width: "164px",
                      transform: isSelected
                        ? "rotateY(0deg) scale(1.05) translateZ(24px)"
                        : offset < 0
                          ? "rotateY(14deg) scale(0.9) translateZ(-8px)"
                          : "rotateY(-14deg) scale(0.9) translateZ(-8px)",
                      transformStyle: "preserve-3d",
                      zIndex: isSelected
                        ? 30
                        : 20 - Math.min(Math.abs(offset), 15),
                      opacity: isSelected ? 1 : 0.72,
                    }}
                  >
                    {/* Archival Physical Hardcover Plate */}
                    <div
                      className={`
                        aspect-[3/4.18] w-full rounded-l-[4px] rounded-r-[10px] p-3
                        flex flex-col justify-between relative transition-all duration-300
                        ${
                          isSelected
                            ? "ring-2 ring-[var(--text-primary)]"
                            : "hover:opacity-90"
                        }
                      `}
                      style={{
                        backgroundColor: color,
                        boxShadow: isSelected
                          ? isLight
                            ? "0 18px 36px -6px rgba(28,25,23,0.15), 0 6px 14px -2px rgba(28,25,23,0.08), inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -1.5px 1.5px rgba(0,0,0,0.12)"
                            : "0 24px 44px -8px rgba(0,0,0,0.5), 0 8px 18px -4px rgba(0,0,0,0.32), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1.5px 1.5px rgba(0,0,0,0.4)"
                          : isLight
                            ? "0 8px 20px -4px rgba(28,25,23,0.08), 0 2px 6px -1px rgba(28,25,23,0.04), inset 0 1px 1px rgba(255,255,255,0.6)"
                            : "0 10px 22px -6px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.15)",
                        border: isLight
                          ? "1px solid rgba(0,0,0,0.06)"
                          : "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {/* Exposed Right Paper Stack */}
                      <div
                        className="absolute top-[2.5px] bottom-[3px] -right-[3.5px] w-[3.5px] rounded-r-[1.5px] pointer-events-none z-1"
                        style={{
                          background: isLight
                            ? "linear-gradient(90deg, #d3cbbe 0%, #f4efe4 45%, #ded6c5 100%)"
                            : "linear-gradient(90deg, #23201b 0%, #3d372e 45%, #2a2720 100%)",
                          boxShadow:
                            "inset 1px 0 1px rgba(0,0,0,0.22), 1px 1px 2px rgba(0,0,0,0.15)",
                        }}
                      >
                        <div
                          className="absolute inset-0 opacity-60"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(180deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px)",
                          }}
                        />
                      </div>

                      {/* Exposed Bottom Paper Edge */}
                      <div
                        className="absolute left-[5px] right-[1px] -bottom-[2.5px] rounded-b-[1.5px] pointer-events-none z-1"
                        style={{
                          height: "2.5px",
                          background: isLight
                            ? "linear-gradient(180deg, #cfc7b9 0%, #eae3d4 60%, #ded6c5 100%)"
                            : "linear-gradient(180deg, #201e1a 0%, #38332b 60%, #26231e 100%)",
                          boxShadow: "inset 0 1px 1px rgba(0,0,0,0.22)",
                        }}
                      />

                      {/* Spine Cylinder Wrap Gradient */}
                      <div
                        className="absolute top-0 bottom-0 left-0 w-3 rounded-l-[4px] pointer-events-none z-10"
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(0,0,0,0.36) 0%, rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.18) 100%)",
                        }}
                      />

                      {/* French Groove Crease */}
                      <div
                        className="absolute top-0 bottom-0 left-3 w-[1.5px] pointer-events-none z-10"
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(255,255,255,0.14) 100%)",
                        }}
                      />

                      {/* Buckram Cloth Texture */}
                      <div
                        className="absolute inset-0 rounded-l-[4px] rounded-r-[10px] pointer-events-none opacity-16 mix-blend-overlay"
                        style={{
                          backgroundImage: `
                            radial-gradient(rgba(255,255,255,0.7) 15%, transparent 20%),
                            radial-gradient(rgba(0,0,0,0.7) 15%, transparent 20%)
                          `,
                          backgroundSize: "2px 2px",
                          backgroundPosition: "0 0, 1px 1px",
                        }}
                      />

                      {/* Top Motif Glyph & Notice Count */}
                      <div className="relative z-10 flex items-center justify-between pl-2">
                        <div
                          className="opacity-90 scale-95"
                          style={{
                            filter: isLight
                              ? "drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.8)) drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.25))"
                              : "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.7)) drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.2))",
                          }}
                        >
                          <SpineMotifGlyph motif={motif} foil={foil} />
                        </div>
                        <span
                          className="text-[8.5px] font-mono uppercase tracking-wider font-semibold opacity-85"
                          style={{ color: foil }}
                        >
                          {count}n
                        </span>
                      </div>

                      {/* Center Title */}
                      <div className="relative z-10 my-auto pl-2 text-center space-y-1">
                        <h4
                          className="font-serif font-bold text-[14px] tracking-tight leading-snug line-clamp-2"
                          style={{
                            color: foil,
                            textShadow: isLight
                              ? "0 -0.5px 0.5px rgba(0,0,0,0.35), 0 0.5px 0.8px rgba(255,255,255,0.85)"
                              : "0 -0.5px 0.8px rgba(0,0,0,0.75), 0 0.5px 0.5px rgba(255,255,255,0.22)",
                          }}
                        >
                          {space.name}
                        </h4>
                        <div
                          className="w-5 h-[1px] mx-auto opacity-50"
                          style={{ backgroundColor: foil }}
                        />
                      </div>

                      {/* Bottom Footer */}
                      <div className="relative z-10 pt-1 border-t border-current/15 flex items-center justify-between text-[8px] pl-2">
                        <span
                          className="uppercase tracking-widest font-sans opacity-70"
                          style={{ color: foil }}
                        >
                          {space.isShared ? "Shared" : "Personal"}
                        </span>
                        <span
                          className="font-serif italic opacity-75"
                          style={{ color: foil }}
                        >
                          sidenotes
                        </span>
                      </div>

                      {/* Ambient Foil Shimmer */}
                      <div className="absolute inset-0 foil-shimmer rounded-l-[4px] rounded-r-[10px] pointer-events-none" />
                    </div>

                    {/* Rapi & Cermat: Soft Diffuse Radial Contact Shadow (Bukan pil hitam kaku) */}
                    <div
                      className="w-[84%] mx-auto h-3 -mt-0.5 rounded-full pointer-events-none transition-all duration-300"
                      style={{
                        background:
                          "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.03) 50%, transparent 75%)",
                        opacity: isSelected ? 1 : 0.45,
                        transform: isSelected ? "scale(1.04)" : "scale(0.88)",
                        filter: isSelected ? "blur(2px)" : "blur(1.5px)",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Carousel Navigation Dots */}
            <div className="flex items-center justify-center gap-1.5 mt-0.5 mb-2">
              {spaces.map((space) => {
                const isSelected = space.id === activeSelected?.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => handleSelectBook(space.id)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? "w-5 bg-[var(--text-primary)] shadow-xs"
                        : "w-1.5 bg-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/40"
                    }`}
                    title={space.name}
                  />
                );
              })}
            </div>

            {/* Clean Typographic Console (Aligned to max-w-md like header) */}
            {activeSelected && (
              <div className="w-full max-w-md mx-auto pt-3 pb-1 flex items-center justify-between gap-3 px-5 border-t border-[var(--glass-border)]/50 mt-1">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={handleOpenActive}
                >
                  <div className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] font-semibold">
                    {activeSelected.isShared
                      ? "Shared Edition"
                      : "Personal Edition"}{" "}
                    • {notesCountMap[activeSelected.id] || 0} notices
                  </div>
                  <h3 className="text-base font-serif font-bold text-[var(--text-primary)] truncate">
                    {activeSelected.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="h-8.5 px-3.5 rounded-full inner-pseudo-glass text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-xs"
                    title="Edit Notebook"
                  >
                    <Pencil className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    disabled={isOpening}
                    onClick={handleOpenActive}
                    className="h-8.5 px-4 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold tracking-wide flex items-center gap-1.5 active:scale-95 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    <span>{isOpening ? "Opening..." : "Open"}</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SPATIAL BOOK-OPENING DIVE OVERLAY */}
        <AnimatePresence>
          {isOpening && activeSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 25 }}
              animate={{ opacity: 1, scale: 1.25, y: -25 }}
              exit={{ opacity: 0, scale: 1.45, filter: "blur(6px)" }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div
                className="w-48 aspect-[3/4.2] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.65)] relative border border-white/25 flex flex-col justify-between p-5 overflow-hidden"
                style={{
                  backgroundColor: selectedPalette.color,
                  color: selectedPalette.textColor,
                }}
              >
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: -75 }}
                  transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "left center" }}
                  className="absolute inset-0 rounded-2xl border border-white/20 bg-inherit"
                />

                <div className="z-10 flex items-center justify-between text-[9px] uppercase tracking-widest font-mono opacity-85">
                  <span>OPENING FOLIO</span>
                  <BookOpen className="w-3 h-3" />
                </div>

                <div className="z-10 my-auto text-center px-2">
                  <h2 className="text-xl font-serif font-bold tracking-tight">
                    {activeSelected.name}
                  </h2>
                  <div className="w-8 h-[1px] bg-current opacity-40 mx-auto my-2" />
                  <p className="text-[10px] font-serif italic opacity-75 line-clamp-1">
                    {activeSelected.description ||
                      "Quiet observations and fleeting notices"}
                  </p>
                </div>

                <div className="z-10 flex items-center justify-between text-[9px] font-mono tracking-wider opacity-75 pt-2 border-t border-current/15">
                  <span>{notesCountMap[activeSelected.id] || 0} NOTICES</span>
                  <span className="font-serif italic">sidenotes</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. HIGH-DENSITY LIQUID GLASS EDIT NOTEBOOK MODAL */}
      {isEditing && activeSelected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsEditing(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[32px] overflow-hidden bg-white/95 dark:bg-[#18181c]/95 backdrop-blur-[40px] saturate-[190%] border border-[var(--glass-border)] shadow-[0_28px_64px_-12px_rgba(0,0,0,0.24)] flex flex-col max-h-[88dvh] animate-in zoom-in-95 duration-200 p-5 relative"
            style={{
              marginTop:
                "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
            }}
          >
            <div className="dynamic-island-specular-rim" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]/50 relative z-10">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
              <div className="text-center">
                <span className="text-[9px] font-semibold tracking-widest uppercase text-[var(--text-tertiary)] block">
                  Volume Atelier
                </span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Edit Notebook
                </span>
              </div>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs hover:opacity-90 active:scale-95 transition-transform cursor-pointer"
              >
                Save
              </button>
            </div>

            <form
              onSubmit={handleSaveEdit}
              className="pt-3.5 space-y-3.5 overflow-y-auto no-scrollbar flex-1 relative z-10"
            >
              <LiveSpinePreview
                title={editName}
                coverStyle={editCover}
                customColor={editCustomColor}
                fontChoice={editFont}
              />

              {/* Title & Epigraph */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Notebook Title
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Field Notes, Kyoto Trip..."
                    className="w-full px-3.5 py-2 rounded-xl apple-card text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Epigraph / Subtitle
                  </label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Brief literary description..."
                    className="w-full px-3.5 py-2 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                  />
                </div>
              </div>

              {/* Cover Palette Jewel Discs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Cover Palette
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-semibold text-[var(--text-primary)]">
                      {editCustomColor
                        ? `Custom`
                        : MODERN_PALETTES.find((p) => p.id === editCover)
                            ?.name || "Cobalt Royal"}
                    </span>
                    {editCustomColor && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setEditCustomColor(undefined);
                        }}
                        className="text-[9.5px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline ml-1 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 p-2 rounded-2xl apple-card shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                  {MODERN_PALETTES.map((pal) => {
                    const isSelected = !editCustomColor && editCover === pal.id;
                    const isLightSwatch = getLuminance(pal.color) > 0.6;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setEditCustomColor(undefined);
                          setEditCover(pal.id);
                        }}
                        className="relative w-6.5 h-6.5 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer group"
                        style={{
                          backgroundColor: pal.color,
                          boxShadow: isSelected
                            ? "0 4px 12px -1px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.4)"
                            : "0 2px 6px -1px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.35)",
                          border: isSelected
                            ? "1.5px solid rgba(255, 255, 255, 0.9)"
                            : "1px solid rgba(0, 0, 0, 0.08)",
                        }}
                        title={pal.name}
                      >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/10 pointer-events-none" />
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 stroke-[2.8] relative z-10 ${isLightSwatch ? "text-neutral-900" : "text-white"}`}
                          />
                        )}
                      </button>
                    );
                  })}

                  <label
                    className="relative w-6.5 h-6.5 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer group"
                    style={{
                      backgroundColor: editCustomColor || "var(--bg-card)",
                      backgroundImage: editCustomColor
                        ? undefined
                        : "conic-gradient(from 180deg at 50% 50%, #e06c75 0deg, #e5c07b 72deg, #98c379 144deg, #61afef 216deg, #c678dd 288deg, #e06c75 360deg)",
                      boxShadow: editCustomColor
                        ? "0 4px 12px -1px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.4)"
                        : "0 2px 6px -1px rgba(0,0,0,0.1)",
                      border: editCustomColor
                        ? "1.5px solid rgba(255, 255, 255, 0.9)"
                        : "1px solid rgba(0, 0, 0, 0.08)",
                    }}
                    title="Custom Color"
                  >
                    <input
                      type="color"
                      value={editCustomColor || "#163cb8"}
                      onChange={(e) => {
                        triggerHaptic("light");
                        setEditCustomColor(e.target.value);
                      }}
                      className="sr-only"
                    />
                    <Pipette
                      className={`w-3 h-3 stroke-[2.2] ${editCustomColor ? (getLuminance(editCustomColor) > 0.6 ? "text-black" : "text-white") : "text-white drop-shadow-xs"}`}
                    />
                  </label>
                </div>
              </div>

              {/* Folio Typography */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                  Folio Typography
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl apple-card shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                  {[
                    { id: "editorial", name: "Newsreader", desc: "Serif" },
                    { id: "sans", name: "Jakarta", desc: "Modern" },
                    { id: "display", name: "Fraunces", desc: "Display" },
                  ].map((f) => {
                    const isSelected = editFont === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setEditFont(f.id as FontChoice);
                        }}
                        className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-bold shadow-xs"
                            : "inner-pseudo-glass text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <div className="text-xs">{f.name}</div>
                        <div className="text-[9px] opacity-75">{f.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* iOS Switch: Shared Space */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl apple-card shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)]">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Shared Space
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">
                      {editShared ? "Synchronized" : "Private notebook"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setEditShared(!editShared);
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ${
                    editShared
                      ? "bg-[var(--text-primary)]"
                      : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                  role="switch"
                  aria-checked={editShared}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] transform transition-transform duration-200 ${
                      editShared ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Shelf Position Reorder */}
              {spaces.length > 1 && onReorderSpaces && (
                <div className="p-3.5 rounded-2xl apple-card shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Shelf Position
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">
                      Position{" "}
                      {spaces.findIndex((s) => s.id === activeSelected.id) + 1}{" "}
                      of {spaces.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={
                        spaces.findIndex((s) => s.id === activeSelected.id) <= 0
                      }
                      onClick={() => handleMoveSpace("left")}
                      className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-transform shadow-xs cursor-pointer"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={
                        spaces.findIndex((s) => s.id === activeSelected.id) >=
                        spaces.length - 1
                      }
                      onClick={() => handleMoveSpace("right")}
                      className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-transform shadow-xs cursor-pointer"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Archive / Delete */}
              {spaces.length > 1 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDeleteActive}
                    className="w-full p-3 rounded-2xl apple-card text-rose-500 hover:text-rose-600 active:scale-98 transition-all text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(244,63,94,0.08)] border border-rose-500/15"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Archive Volume</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 4. HIGH-DENSITY LIQUID GLASS CREATE NOTEBOOK MODAL */}
      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsCreating(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[32px] overflow-hidden bg-white/95 dark:bg-[#18181c]/95 backdrop-blur-[40px] saturate-[190%] border border-[var(--glass-border)] shadow-[0_28px_64px_-12px_rgba(0,0,0,0.24)] flex flex-col max-h-[88dvh] animate-in zoom-in-95 duration-200 p-5 relative"
            style={{
              marginTop:
                "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
            }}
          >
            <div className="dynamic-island-specular-rim" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]/50 relative z-10">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
              <div className="text-center">
                <span className="text-[9px] font-semibold tracking-widest uppercase text-[var(--text-tertiary)] block">
                  Bind Volume
                </span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  New Notebook
                </span>
              </div>
              <div className="w-7" />
            </div>

            <form
              onSubmit={handleCreateSubmit}
              className="pt-3.5 space-y-3.5 overflow-y-auto no-scrollbar flex-1 relative z-10"
            >
              <LiveSpinePreview
                title={newName}
                coverStyle={newCover}
                customColor={newCustomColor}
              />

              {/* Title & Epigraph */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Notebook Title
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Kyoto Trip, Morning Thoughts..."
                    autoFocus
                    className="w-full px-3.5 py-2 rounded-xl apple-card text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Epigraph / Subtitle
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief literary description..."
                    className="w-full px-3.5 py-2 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                  />
                </div>
              </div>

              {/* Cover Palette Jewel Discs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Cover Palette
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-semibold text-[var(--text-primary)]">
                      {newCustomColor
                        ? `Custom`
                        : MODERN_PALETTES.find((p) => p.id === newCover)
                            ?.name || "Cobalt Royal"}
                    </span>
                    {newCustomColor && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setNewCustomColor(undefined);
                        }}
                        className="text-[9.5px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline ml-1 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 p-2 rounded-2xl apple-card shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                  {MODERN_PALETTES.map((pal) => {
                    const isSelected = !newCustomColor && newCover === pal.id;
                    const isLightSwatch = getLuminance(pal.color) > 0.6;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setNewCustomColor(undefined);
                          setNewCover(pal.id);
                        }}
                        className="relative w-6.5 h-6.5 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer group"
                        style={{
                          backgroundColor: pal.color,
                          boxShadow: isSelected
                            ? "0 4px 12px -1px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.4)"
                            : "0 2px 6px -1px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.35)",
                          border: isSelected
                            ? "1.5px solid rgba(255, 255, 255, 0.9)"
                            : "1px solid rgba(0, 0, 0, 0.08)",
                        }}
                        title={pal.name}
                      >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/10 pointer-events-none" />
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 stroke-[2.8] relative z-10 ${isLightSwatch ? "text-neutral-900" : "text-white"}`}
                          />
                        )}
                      </button>
                    );
                  })}

                  <label
                    className="relative w-6.5 h-6.5 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer group"
                    style={{
                      backgroundColor: newCustomColor || "var(--bg-card)",
                      backgroundImage: newCustomColor
                        ? undefined
                        : "conic-gradient(from 180deg at 50% 50%, #e06c75 0deg, #e5c07b 72deg, #98c379 144deg, #61afef 216deg, #c678dd 288deg, #e06c75 360deg)",
                      boxShadow: newCustomColor
                        ? "0 4px 12px -1px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.4)"
                        : "0 2px 6px -1px rgba(0,0,0,0.1)",
                      border: newCustomColor
                        ? "1.5px solid rgba(255, 255, 255, 0.9)"
                        : "1px solid rgba(0, 0, 0, 0.08)",
                    }}
                    title="Custom Color"
                  >
                    <input
                      type="color"
                      value={newCustomColor || "#163cb8"}
                      onChange={(e) => {
                        triggerHaptic("light");
                        setNewCustomColor(e.target.value);
                      }}
                      className="sr-only"
                    />
                    <Pipette
                      className={`w-3 h-3 stroke-[2.2] ${newCustomColor ? (getLuminance(newCustomColor) > 0.6 ? "text-black" : "text-white") : "text-white drop-shadow-xs"}`}
                    />
                  </label>
                </div>
              </div>

              {/* iOS Switch: Shared Space */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl apple-card shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)]">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Shared Space
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">
                      Sync moments together
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setNewShared(!newShared);
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ${
                    newShared
                      ? "bg-[var(--text-primary)]"
                      : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                  role="switch"
                  aria-checked={newShared}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] transform transition-transform duration-200 ${
                      newShared ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!newName.trim()}
                className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-xs tracking-wide transition-all disabled:opacity-40 active:scale-98 shadow-sm flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer mt-2"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Bind into Bookshelf</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Backward compatibility alias
export const BookshelfModal = ({
  isOpen,
  onClose,
  onBackToNotebook: _unusedBack,
  ...props
}: Partial<BookshelfViewProps> & {
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  if (isOpen === false) return null;
  return (
    <BookshelfView
      onBackToNotebook={onClose || _unusedBack || (() => {})}
      spaces={props.spaces || []}
      activeSpaceId={props.activeSpaceId || ""}
      notesCountMap={props.notesCountMap || {}}
      onSelectSpace={props.onSelectSpace || (() => {})}
      onCreateSpace={props.onCreateSpace || (() => {})}
      {...props}
    />
  );
};
