import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Space } from "@/types";
import { getCoverPalette, getLuminance } from "./BookshelfSpine";

interface BookshelfFolioProps {
  space: Space;
  noteCount: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function BookshelfFolio({
  space,
  noteCount,
  isSelected,
  onSelect,
}: BookshelfFolioProps) {
  const { color, foil, motif, textColor } = getCoverPalette(
    space.coverStyle || "klein",
    space.customColor,
    space.name,
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const isLight = getLuminance(color) > 0.6;

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -(y / (rect.height / 2)) * 10,
      y: (x / (rect.width / 2)) * 12,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={onSelect}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative cursor-pointer select-none scene-3d py-3 px-2"
      animate={{
        scale: isSelected ? 1 : 0.94,
        opacity: isSelected ? 1 : 0.68,
      }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
    >
      {/* 3D Book Volume Container */}
      <motion.div
        className="w-48 aspect-[3/4.15] rounded-l-[4px] rounded-r-[10px] relative transition-transform duration-150 preserve-3d"
        style={{
          transform: `rotateY(${tilt.y - 10}deg) rotateX(${tilt.x + 4}deg) translateZ(${isSelected ? 22 : 0}px)`,
        }}
      >
        {/* Front Cover Plate */}
        <div
          className={`
            w-full h-full rounded-l-[4px] rounded-r-[10px] relative overflow-hidden flex flex-col justify-between p-4.5 border transition-all duration-300
            ${isSelected ? "border-white/35 dark:border-white/20" : "border-white/15 dark:border-white/10"}
          `}
          style={{
            backgroundColor: color,
            color: textColor,
            boxShadow: isSelected
              ? "0 20px 40px -10px rgba(0,0,0,0.4), 0 8px 16px -4px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.28), inset 0 -1.5px 1.5px rgba(0,0,0,0.4)"
              : "0 10px 24px -6px rgba(0,0,0,0.25), 0 4px 8px -2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.3)",
          }}
        >
          {/* Archival Buckram Cloth Micro-Weave Texture */}
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

          {/* Left Spine Curvature Cylinder Gradient */}
          <div
            className="absolute top-0 bottom-0 left-0 w-4 rounded-l-[4px] pointer-events-none z-10"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.2) 100%)",
            }}
          />

          {/* French Groove Hinge Crease Indent */}
          <div
            className="absolute top-0 bottom-0 left-4 w-[1.5px] pointer-events-none z-10"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.15) 100%)",
            }}
          />

          {/* Inset Archival Border Line */}
          <div
            className="absolute inset-2.5 rounded-lg border pointer-events-none"
            style={{
              borderColor: `${foil}35`,
              boxShadow: isLight
                ? "inset 0 0.5px 0.5px rgba(255,255,255,0.7), 0 0.5px 0.5px rgba(0,0,0,0.05)"
                : "inset 0 0.5px 0.5px rgba(255,255,255,0.2), 0 0.5px 0.5px rgba(0,0,0,0.3)",
            }}
          />

          {/* Cover Header */}
          <div className="z-10 flex items-center justify-between pl-2">
            <span
              className="text-[8px] font-sans font-bold uppercase tracking-[0.2em]"
              style={{
                color: foil,
                opacity: 0.85,
                textShadow: isLight
                  ? "0 0.5px 0.5px rgba(255,255,255,0.8)"
                  : "0 -0.5px 0.5px rgba(0,0,0,0.7)",
              }}
            >
              {space.isShared ? "SHARED ATELIER" : "FOLIO EDITION"}
            </span>

            {/* Emblem Motif Glyph with Debossed Shadow */}
            <div
              style={{
                color: foil,
                filter: isLight
                  ? "drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.8)) drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.25))"
                  : "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.7)) drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.2))",
              }}
            >
              {motif === 0 && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              )}
              {motif === 1 && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                </svg>
              )}
              {motif === 2 && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="12 2 22 12 12 22 2 12" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              )}
              {motif === 3 && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="8" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
              )}
            </div>
          </div>

          {/* Cover Center Title with Debossed Foil Stamping */}
          <div className="z-10 text-center my-auto px-2">
            <h2
              className="text-lg font-serif font-bold tracking-tight leading-snug line-clamp-2"
              style={{
                color: foil,
                textShadow: isLight
                  ? "0 -0.5px 0.5px rgba(0,0,0,0.35), 0 0.5px 0.8px rgba(255,255,255,0.85)"
                  : "0 -0.5px 0.8px rgba(0,0,0,0.75), 0 0.5px 0.5px rgba(255,255,255,0.22)",
              }}
            >
              {space.name}
            </h2>

            <div
              className="w-7 h-[1px] mx-auto my-2 opacity-50"
              style={{
                backgroundColor: foil,
                boxShadow: isLight
                  ? "0 0.5px 0.5px rgba(255,255,255,0.7)"
                  : "0 -0.5px 0.5px rgba(0,0,0,0.6)",
              }}
            />

            <p
              className="text-[9.5px] font-serif italic line-clamp-2 max-w-[150px] mx-auto leading-relaxed"
              style={{
                color: foil,
                opacity: 0.82,
                textShadow: isLight
                  ? "0 0.5px 0.5px rgba(255,255,255,0.6)"
                  : "0 -0.5px 0.5px rgba(0,0,0,0.6)",
              }}
            >
              {space.description ||
                "A quiet repository of fleeting observations"}
            </p>
          </div>

          {/* Cover Footer */}
          <div className="z-10 flex items-center justify-between pt-1.5 border-t border-current/15 text-[8.5px] pl-2">
            <span
              className="font-mono uppercase tracking-wider font-medium"
              style={{ color: foil, opacity: 0.8 }}
            >
              {noteCount} {noteCount === 1 ? "NOTICE" : "NOTICES"}
            </span>

            <span
              className="font-serif italic font-medium"
              style={{ color: foil, opacity: 0.85 }}
            >
              sidenotes
            </span>
          </div>

          {/* Soft Liquid Shimmer Overlay */}
          <div className="absolute inset-0 foil-shimmer rounded-l-[4px] rounded-r-[10px] pointer-events-none" />
        </div>

        {/* 3D Left Spine Edge */}
        <div
          className="absolute top-0 bottom-0 -left-3 w-3 rounded-l-xs flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: color,
            filter: "brightness(0.72)",
            transform: "rotateY(-90deg)",
            transformOrigin: "right center",
          }}
        >
          <div className="h-3/4 w-[1px] bg-white/20" />
        </div>

        {/* 3D Right Paper Edge Thickness */}
        <div
          className="absolute top-[2px] bottom-[2px] -right-[3.5px] w-[3.5px] rounded-r-[1.5px] pointer-events-none z-1"
          style={{
            background: isLight
              ? "linear-gradient(90deg, #d3cbbe 0%, #f4efe4 45%, #ded6c5 100%)"
              : "linear-gradient(90deg, #23201b 0%, #3d372e 45%, #2a2720 100%)",
            boxShadow:
              "inset 1px 0 1px rgba(0,0,0,0.25), 1px 1px 2px rgba(0,0,0,0.18)",
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

        {/* 3D Bottom Paper Edge */}
        <div
          className="absolute left-[6px] right-[1px] -bottom-[2.5px] rounded-b-[1.5px] pointer-events-none z-1"
          style={{
            height: "2.5px",
            background: isLight
              ? "linear-gradient(180deg, #cfc7b9 0%, #eae3d4 60%, #ded6c5 100%)"
              : "linear-gradient(180deg, #201e1a 0%, #38332b 60%, #26231e 100%)",
            boxShadow: "inset 0 1px 1px rgba(0,0,0,0.25)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
