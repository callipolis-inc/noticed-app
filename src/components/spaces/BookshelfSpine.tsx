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

export function getCoverPalette(
  style: CoverStyle = "klein",
  customColor?: string,
  name: string = "",
): {
  color: string;
  foil: string;
  textColor: string;
  motif: number;
} {
  let nameHash = 0;
  for (let i = 0; i < name.length; i++) {
    nameHash = (nameHash << 5) - nameHash + name.charCodeAt(i);
  }
  const motifIndex = Math.abs(nameHash) % 6;

  if (customColor) {
    const lum = getLuminance(customColor);
    const isLight = lum > 0.6;
    return {
      color: customColor,
      foil: isLight ? "#1e40af" : "#faf8f2",
      textColor: isLight ? "#1e40af" : "#faf8f2",
      motif: motifIndex,
    };
  }

  switch (style) {
    case "klein":
      return {
        color: "#163cb8",
        foil: "#faf8f2",
        textColor: "#faf8f2",
        motif: motifIndex,
      };
    case "marble":
      return {
        color: "#163324",
        foil: "#f4f0e6",
        textColor: "#f4f0e6",
        motif: motifIndex,
      };
    case "kraft":
      return {
        color: "#8e351e",
        foil: "#fdf8ee",
        textColor: "#fdf8ee",
        motif: motifIndex,
      };
    case "electric":
      return {
        color: "#372db8",
        foil: "#f5f3ff",
        textColor: "#f5f3ff",
        motif: motifIndex,
      };
    case "alabaster":
      return {
        color: "#f2ede4",
        foil: "#163cb8",
        textColor: "#163cb8",
        motif: motifIndex,
      };
    case "obsidian":
    default:
      return {
        color: "#121214",
        foil: "#f8f8fa",
        textColor: "#f8f8fa",
        motif: motifIndex,
      };
  }
}

// Deterministic natural height & width variation for books
function getBookDimensions(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  const positive = Math.abs(hash);
  const heights = [196, 204, 212, 198, 206];
  const widths = [36, 40, 38, 42, 37];
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
  const { color, foil, motif } = getCoverPalette(
    space.coverStyle || "klein",
    space.customColor,
    space.name,
  );
  const { height: spineHeight, width: spineWidth } = getBookDimensions(
    space.name,
  );
  const isLight = getLuminance(color) > 0.6;

  const getFontFamily = () => {
    switch (space.fontChoice) {
      case "sans":
        return "var(--font-sans, sans-serif)";
      case "display":
        return "var(--font-display, serif)";
      case "editorial":
      default:
        return "var(--font-serif, Georgia, serif)";
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
        className="w-full h-full rounded-t-[6px] rounded-b-[4px] relative overflow-hidden flex flex-col items-center justify-between py-2.5 transition-all duration-300"
        style={{
          backgroundColor: color,
          boxShadow: isSelected
            ? "0 14px 26px -4px rgba(0,0,0,0.42), 0 3px 8px -1px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1.5px 1.5px rgba(0,0,0,0.4), inset 1.5px 0 2px rgba(255,255,255,0.12), inset -1.5px 0 2px rgba(0,0,0,0.32)"
            : "0 6px 14px -2px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.14), inset 0 -1.5px 1.5px rgba(0,0,0,0.35), inset 1px 0 1.5px rgba(255,255,255,0.08), inset -1px 0 1.5px rgba(0,0,0,0.25)",
        }}
      >
        {/* Subtle Specular Top Rim Reflection */}
        <div
          className="absolute top-0 inset-x-1 h-[1.5px] pointer-events-none z-20 rounded-t-xs"
          style={{
            background: isLight
              ? "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.75) 50%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.24) 50%, transparent 100%)",
          }}
        />

        {/* Archival Buckram Cloth Weave (Interlocking Micro-Fibers) */}
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

        {/* Deep Matte Curvature Falloff */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.18) 7%, rgba(0,0,0,0.0) 20%, rgba(255,255,255,0.05) 38%, rgba(0,0,0,0.0) 58%, rgba(0,0,0,0.16) 82%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* French Groove Hinge Indents (Left & Right Book Joints) */}
        <div
          className="absolute top-0 bottom-0 left-[2.5px] w-[1.5px] pointer-events-none z-10 opacity-75"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.12) 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-[2.5px] w-[1.5px] pointer-events-none z-10 opacity-75"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.45) 100%)",
          }}
        />

        {/* Top Debossed Accent Bar */}
        <div
          className="w-5 h-[1.5px] rounded-full shrink-0 z-10 opacity-80"
          style={{
            backgroundColor: foil,
            boxShadow: isLight
              ? "0 -0.5px 0.5px rgba(0,0,0,0.3), 0 0.5px 0.5px rgba(255,255,255,0.7)"
              : "0 -0.5px 0.5px rgba(0,0,0,0.6), 0 0.5px 0.5px rgba(255,255,255,0.2)",
          }}
        />

        {/* Vertical Stamped Title (Deep Letterpress Deboss Bite into Cloth) */}
        <div className="flex-1 flex items-center justify-center z-10 overflow-hidden my-3 px-1">
          <span
            className="text-[12.5px] font-semibold tracking-tight whitespace-nowrap truncate max-h-[145px]"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontFamily: getFontFamily(),
              color: foil,
              textShadow: isLight
                ? "0 -0.5px 0.5px rgba(0,0,0,0.35), 0 0.5px 0.5px rgba(255,255,255,0.85)"
                : "0 -0.5px 0.5px rgba(0,0,0,0.7), 0 0.5px 0.5px rgba(255,255,255,0.2)",
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
                : "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.6)) drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.2))",
            }}
          >
            <SpineMotifGlyph motif={motif} foil={foil} />
          </div>
          <div
            className="w-5 h-[1.5px] rounded-full shrink-0 opacity-80"
            style={{
              backgroundColor: foil,
              boxShadow: isLight
                ? "0 -0.5px 0.5px rgba(0,0,0,0.3), 0 0.5px 0.5px rgba(255,255,255,0.7)"
                : "0 -0.5px 0.5px rgba(0,0,0,0.6), 0 0.5px 0.5px rgba(255,255,255,0.2)",
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
