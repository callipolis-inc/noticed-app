import { CoverStyle } from "@/types";
import {
  getCoverPalette,
  getLuminance,
  SpineMotifGlyph,
} from "./BookshelfSpine";

interface NotebookCoverProps {
  name: string;
  coverStyle?: CoverStyle;
  customColor?: string;
  noteCount?: number;
  isSelected?: boolean;
  className?: string;
}

export function NotebookCover({
  name,
  coverStyle = "kraft",
  customColor,
  noteCount,
  isSelected = false,
  className = "",
}: NotebookCoverProps) {
  // Mapping fallback jika menerima legacy coverStyle lama
  const normalizedStyle: CoverStyle =
    coverStyle === ("collage" as any) || coverStyle === ("pattern" as any)
      ? "kraft"
      : coverStyle === ("linen" as any)
        ? "alabaster"
        : coverStyle;

  const { color, foil, motif, textColor } = getCoverPalette(
    normalizedStyle,
    customColor,
    name,
  );
  const isLight = getLuminance(color) > 0.6;

  return (
    <div
      className={`
        relative aspect-[3/4.15] w-full rounded-l-[4px] rounded-r-[10px] select-none
        transition-all duration-300 group cursor-pointer
        hover:-translate-y-1 hover:shadow-xl
        ${
          isSelected
            ? "scale-[1.02] ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-base)] shadow-2xl"
            : "hover:scale-[1.01] opacity-95 hover:opacity-100"
        }
        ${className}
      `}
      style={{
        backgroundColor: color,
        color: textColor,
        boxShadow: isSelected
          ? "0 18px 36px -8px rgba(0,0,0,0.38), 0 6px 14px -3px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.28), inset 0 -1.5px 1.5px rgba(0,0,0,0.4)"
          : "0 8px 20px -4px rgba(0,0,0,0.18), 0 2px 6px -1px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.3)",
      }}
    >
      {/* 1. KETEBALAN TUMPUKAN KERTAS GADING (KANAN & BAWAH) */}
      {/* Right Exposed Paper Thickness */}
      <div
        className="absolute top-[2.5px] bottom-[3px] -right-[3px] w-[3.5px] rounded-r-[1.5px] pointer-events-none z-1"
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

      {/* Bottom Exposed Paper Thickness */}
      <div
        className="absolute left-[5px] right-[1px] -bottom-[2px] rounded-b-[1.5px] pointer-events-none z-1"
        style={{
          height: "2.5px",
          background: isLight
            ? "linear-gradient(180deg, #cfc7b9 0%, #eae3d4 60%, #ded6c5 100%)"
            : "linear-gradient(180deg, #201e1a 0%, #38332b 60%, #26231e 100%)",
          boxShadow: "inset 0 1px 1px rgba(0,0,0,0.25)",
        }}
      />

      {/* 2. TEKSTUR JILID BUKU FISIK */}
      {/* Archival Buckram Cloth Micro-Weave Texture */}
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

      {/* Left Spine Curvature Cylinder Gradient */}
      <div
        className="absolute top-0 bottom-0 left-0 w-3 rounded-l-[4px] pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.2) 100%)",
        }}
      />

      {/* French Groove Hinge Crease Indent */}
      <div
        className="absolute top-0 bottom-0 left-3 w-[1.5px] pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.15) 100%)",
        }}
      />

      {/* Inset Archival Border Frame */}
      <div
        className="absolute inset-2.5 rounded-lg border pointer-events-none"
        style={{
          borderColor: `${foil}35`,
          boxShadow: isLight
            ? "inset 0 0.5px 0.5px rgba(255,255,255,0.7), 0 0.5px 0.5px rgba(0,0,0,0.05)"
            : "inset 0 0.5px 0.5px rgba(255,255,255,0.2), 0 0.5px 0.5px rgba(0,0,0,0.3)",
        }}
      />

      {/* 3. TAMPILAN INTERIOR SAMPUL BUKU */}
      <div className="relative z-10 h-full p-3.5 pl-5 flex flex-col justify-between">
        {/* Cover Header: Motif Glyph & Edition Tag */}
        <div className="flex items-center justify-between">
          <div
            className="opacity-90 scale-90"
            style={{
              filter: isLight
                ? "drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.8)) drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.25))"
                : "drop-shadow(0 -0.5px 0.5px rgba(0,0,0,0.7)) drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.2))",
            }}
          >
            <SpineMotifGlyph motif={motif} foil={foil} />
          </div>

          <span
            className="text-[7.5px] font-sans font-bold uppercase tracking-[0.2em] opacity-80"
            style={{
              color: foil,
              textShadow: isLight
                ? "0 0.5px 0.5px rgba(255,255,255,0.8)"
                : "0 -0.5px 0.5px rgba(0,0,0,0.7)",
            }}
          >
            ATELIER
          </span>
        </div>

        {/* Center Title with Debossed Foil Stamping */}
        <div className="text-center my-auto px-1 space-y-1">
          <h3
            className="font-serif font-bold text-[13px] tracking-tight leading-snug line-clamp-2"
            style={{
              color: foil,
              textShadow: isLight
                ? "0 -0.5px 0.5px rgba(0,0,0,0.35), 0 0.5px 0.8px rgba(255,255,255,0.85)"
                : "0 -0.5px 0.8px rgba(0,0,0,0.75), 0 0.5px 0.5px rgba(255,255,255,0.22)",
            }}
          >
            {name}
          </h3>

          <div
            className="w-5 h-[1px] mx-auto opacity-50"
            style={{
              backgroundColor: foil,
              boxShadow: isLight
                ? "0 0.5px 0.5px rgba(255,255,255,0.7)"
                : "0 -0.5px 0.5px rgba(0,0,0,0.6)",
            }}
          />
        </div>

        {/* Cover Footer: Note Count & Colophon */}
        <div className="flex items-center justify-between pt-1 border-t border-current/15 text-[8px]">
          <span
            className="font-mono uppercase tracking-wider font-semibold opacity-85"
            style={{ color: foil }}
          >
            {typeof noteCount === "number" ? `${noteCount}n` : "Vol. 1"}
          </span>

          <span
            className="font-serif italic opacity-80"
            style={{ color: foil }}
          >
            sidenotes
          </span>
        </div>
      </div>

      {/* Shimmer Ambient Foil Reflection */}
      <div className="absolute inset-0 foil-shimmer rounded-l-[4px] rounded-r-[10px] pointer-events-none" />
    </div>
  );
}
