import { useRef } from "react";
import { motion } from "framer-motion";
import { Space, CoverStyle } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";

interface BookshelfSpineProps {
  space: Space;
  noteCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onOpen?: () => void;
}

export function getLuminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length !== 6) return 0.5;
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export const LUXURY_FOIL_PRESETS = [
  { id: "gold", name: "Antique Gold", color: "#e6ca85", desc: "Classic 24k leaf letterpress" },
  { id: "silver", name: "Polished Silver", color: "#f1f5f9", desc: "Cool sterling silver foil" },
  { id: "rosegold", name: "Rose Gold", color: "#e5b4bd", desc: "Warm coppery blush leaf" },
  { id: "sage", name: "Pale Sage", color: "#d1dfbe", desc: "Subtle botanical champagne" },
  { id: "ivory", name: "Warm Ivory", color: "#fae8b2", desc: "Aged vellum warm cream" },
  { id: "platinum", name: "Platinum", color: "#d0d9ea", desc: "Deep cool noble metal" },
  { id: "white", name: "Chalk White", color: "#ffffff", desc: "Pure high-contrast letterpress" },
];

export function getCoverPalette(
  style: CoverStyle = "obsidian",
  customColor?: string,
  name: string = "",
  customFoil?: string,
): {
  color: string;
  gradient: string;
  foil: string;
  textColor: string;
  motif: number;
} {
  let nameHash = 0;
  for (let i = 0; i < name.length; i++) {
    nameHash = (nameHash << 5) - nameHash + name.charCodeAt(i);
  }
  const motifIndex = Math.abs(nameHash) % 6;

  let baseColor = "#111215";
  let gradient = "linear-gradient(90deg, #1c1d22 0%, #111215 35%, #090a0c 100%)";
  let defaultFoil = "#f1f5f9";

  if (customColor) {
    baseColor = customColor;
    gradient = `linear-gradient(90deg, ${customColor} 0%, ${customColor} 100%)`;
    const lum = getLuminance(customColor);
    defaultFoil = lum > 0.6 ? "#111215" : "#f1f5f9";
  } else {
    switch (style) {
      case "espresso":
        baseColor = "#1d1512";
        gradient = "linear-gradient(90deg, #32211b 0%, #1d1512 35%, #150d0a 100%)";
        defaultFoil = "#e6ca85";
        break;
      case "klein":
        baseColor = "#0d1424";
        gradient = "linear-gradient(90deg, #18233a 0%, #0d1424 35%, #080c16 100%)";
        defaultFoil = "#e8d5a3";
        break;
      case "marble":
        baseColor = "#0e1c14";
        gradient = "linear-gradient(90deg, #172c21 0%, #0e1c14 35%, #08120c 100%)";
        defaultFoil = "#d1dfbe";
        break;
      case "electric":
        baseColor = "#1d1018";
        gradient = "linear-gradient(90deg, #2d1825 0%, #1d1018 35%, #12090e 100%)";
        defaultFoil = "#e5b4bd";
        break;
      case "kraft":
        baseColor = "#221612";
        gradient = "linear-gradient(90deg, #32211b 0%, #221612 35%, #150d0a 100%)";
        defaultFoil = "#fae8b2";
        break;
      case "periwinkle":
        baseColor = "#1a1d22";
        gradient = "linear-gradient(90deg, #262b32 0%, #1a1d22 35%, #101215 100%)";
        defaultFoil = "#ffffff";
        break;
      case "alabaster":
        baseColor = "#f2ede4";
        gradient = "linear-gradient(90deg, #f7f3ec 0%, #f2ede4 35%, #ded7cc 100%)";
        defaultFoil = "#111215";
        break;
      case "obsidian":
      default:
        baseColor = "#111215";
        gradient = "linear-gradient(90deg, #1c1d22 0%, #111215 35%, #090a0c 100%)";
        defaultFoil = "#f1f5f9";
        break;
    }
  }

  const finalFoil = customFoil || defaultFoil;

  return {
    color: baseColor,
    gradient,
    foil: finalFoil,
    textColor: finalFoil,
    motif: motifIndex,
  };
}

// Deterministic natural height & width variation for books
function getBookDimensions(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  const positive = Math.abs(hash);
  const heights = [220, 230, 240, 224, 234];
  const widths = [38, 42, 40, 44, 39];
  return {
    height: heights[positive % heights.length],
    width: widths[positive % widths.length],
  };
}

export function SpineMotifGlyph({
  motif,
  foil,
}: {
  motif: number;
  foil: string;
}) {
  switch (motif) {
    case 0:
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={foil}
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="5.64" y1="5.64" x2="18.36" y2="18.36" />
          <line x1="5.64" y1="18.36" x2="18.36" y2="5.64" />
        </svg>
      );
    case 1:
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={foil}
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5" />
        </svg>
      );
    case 2:
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={foil}
          strokeWidth="2"
        >
          <rect
            x="5.5"
            y="5.5"
            width="13"
            height="13"
            rx="1.2"
            transform="rotate(45 12 12)"
          />
          <rect
            x="8.5"
            y="8.5"
            width="7"
            height="7"
            rx="0.5"
            transform="rotate(45 12 12)"
            fill={foil}
            fillOpacity="0.45"
          />
        </svg>
      );
    case 3:
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill={foil}>
          <circle cx="5" cy="5" r="2.2" />
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="19" cy="5" r="2.2" />
          <circle cx="5" cy="12" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="19" cy="12" r="2.2" />
          <circle cx="5" cy="19" r="2.2" />
          <circle cx="12" cy="19" r="2.2" />
          <circle cx="19" cy="19" r="2.2" />
        </svg>
      );
    case 4:
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={foil}
          strokeWidth="2.2"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.2" fill={foil} />
        </svg>
      );
    case 5:
    default:
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={foil}
          strokeWidth="2"
        >
          <path
            d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
            fill={foil}
            fillOpacity="0.35"
          />
        </svg>
      );
  }
}

export function BookshelfSpine({
  space,
  noteCount: _noteCount,
  isSelected,
  onSelect,
  onOpen,
}: BookshelfSpineProps) {
  const { color, gradient, foil, motif } = getCoverPalette(
    space.coverStyle || "espresso",
    space.customColor,
    space.name,
    space.foilColor,
  );
  const { height: spineHeight, width: spineWidth } = getBookDimensions(
    space.name,
  );
  const isLight = getLuminance(color) > 0.6;

  const getFontFamily = () => {
    switch (space.fontChoice) {
      case "sans":
        return "var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif)";
      case "editorial":
        return "var(--font-serif, 'Newsreader', Georgia, serif)";
      case "display":
      default:
        return "var(--font-display, 'Cormorant Garamond', Georgia, serif)";
    }
  };

  const lastTapRef = useRef<number>(0);

  const handleClick = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 320;
    lastTapRef.current = now;

    if (isDoubleTap && onOpen) {
      triggerSuccessHaptic();
      onSelect();
      onOpen();
    } else if (isSelected && onOpen) {
      triggerSuccessHaptic();
      onOpen();
    } else {
      triggerHaptic("light");
      onSelect();
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      className="relative cursor-pointer select-none mx-1 sm:mx-1.5 flex flex-col items-center shrink-0"
      style={{
        width: `${spineWidth}px`,
        height: `${spineHeight}px`,
        transformStyle: "preserve-3d",
      }}
      animate={{
        translateZ: isSelected ? 24 : 0,
        y: isSelected ? -8 : 0,
        scale: isSelected ? 1.025 : 1,
        rotateX: isSelected ? -1.5 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 24,
      }}
      whileTap={{ scale: 0.96 }}
    >
      {/* 3D Spine Body: Archival Buckram Cloth Bound Volume */}
      <div
        className="w-full h-full rounded-t-[5px] rounded-b-[3px] relative overflow-hidden flex flex-col items-center justify-between py-2.5 transition-all duration-300"
        style={{
          background: gradient,
          borderTop: `1px solid rgba(255,255,255,${isSelected ? 0.35 : 0.12})`,
          borderLeft: `1px solid rgba(255,255,255,${isSelected ? 0.25 : 0.08})`,
          borderRight: "1px solid rgba(0,0,0,0.7)",
          boxShadow: isSelected
            ? "0 18px 36px -4px rgba(0,0,0,0.75), 0 0 16px rgba(255,255,255,0.08), inset 2px 0 4px rgba(255,255,255,0.12), inset -3px 0 6px rgba(0,0,0,0.6)"
            : "0 6px 16px -2px rgba(0,0,0,0.35), inset 2px 0 4px rgba(255,255,255,0.08), inset -3px 0 6px rgba(0,0,0,0.65)",
        }}
      >
        {/* Spine Cylindrical Highlight Streaks */}
        <div className="absolute inset-y-0 left-1 w-2 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-1 w-1.5 bg-gradient-to-l from-black/40 to-transparent pointer-events-none" />

        {/* Subtle Specular Top Rim Reflection */}
        <div
          className="absolute top-0 inset-x-1 h-[1.5px] pointer-events-none z-20 rounded-t-xs"
          style={{
            background: isLight
              ? "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.75) 50%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.28) 50%, transparent 100%)",
          }}
        />

        {/* Archival Buckram Cloth Weave (Interlocking Micro-Fibers) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-14 mix-blend-overlay"
          style={{
            backgroundImage: `
              radial-gradient(rgba(255,255,255,0.7) 15%, transparent 20%),
              radial-gradient(rgba(0,0,0,0.7) 15%, transparent 20%)
            `,
            backgroundSize: "2px 2px",
            backgroundPosition: "0 0, 1px 1px",
          }}
        />

        {/* Deep Matte Curvature Falloff */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.14) 10%, rgba(0,0,0,0) 30%, rgba(255,255,255,0.04) 55%, rgba(0,0,0,0.14) 80%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* French Groove Hinge Indents (Left & Right Book Joints) */}
        <div
          className="absolute top-0 bottom-0 left-[2.5px] w-[1px] pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.3) 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-[2.5px] w-[1px] pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Top Debossed Accent Bar */}
        <div
          className="w-5 h-[1px] rounded-full shrink-0 z-10 opacity-80"
          style={{
            backgroundColor: isLight ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.25)",
          }}
        />

        {/* Vertical Stamped Title (Cormorant Garamond, Letterspaced, Foiled) */}
        <div className="flex-1 flex items-center justify-center z-10 overflow-hidden my-3 px-1">
          <span
            className="text-[13px] font-normal tracking-[0.16em] whitespace-nowrap truncate max-h-[155px]"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontFamily: getFontFamily(),
              color: foil,
              textShadow: isLight
                ? "0 -0.5px 0.5px rgba(0,0,0,0.35), 0 0.5px 0.5px rgba(255,255,255,0.85)"
                : "0 1px 3px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,0.8)",
            }}
          >
            {space.name}
          </span>
        </div>

        {/* Bottom Ensemble: Geometric Motif + Debossed Bar */}
        <div className="z-10 flex flex-col items-center gap-1.5 shrink-0">
          <div
            className="opacity-90"
            style={{
              filter: isLight
                ? "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.3)) drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.7))"
                : "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
            }}
          >
            <SpineMotifGlyph motif={motif} foil={foil} />
          </div>
          <div
            className="w-5 h-[1px] rounded-full shrink-0 opacity-80"
            style={{
              backgroundColor: isLight ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.25)",
            }}
          />
        </div>

        {/* Bottom Shelf Caustic Reflection Rim */}
        <div
          className="absolute bottom-0 inset-x-1.5 h-[1.5px] pointer-events-none z-20 opacity-60 rounded-b-xs"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Adaptive Contact Shadow under book base */}
      <motion.div
        className="absolute -bottom-1 inset-x-1 h-2 pointer-events-none rounded-full bg-black/45"
        animate={{
          opacity: isSelected ? 0.25 : 0.65,
          scaleX: isSelected ? 0.85 : 1,
          scaleY: isSelected ? 1.4 : 1,
          filter: isSelected ? "blur(3px)" : "blur(1.5px)",
          y: isSelected ? 4 : 0,
        }}
        transition={{ duration: 0.25 }}
      />

      {/* Floating Apple-Style Jewel Active Indicator */}
      {isSelected && (
        <motion.div
          layoutId="spineActiveDot"
          className="absolute -top-3.5 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] shadow-[0_0_8px_rgba(255,255,255,0.6)]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.25, 1], opacity: 1 }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}
