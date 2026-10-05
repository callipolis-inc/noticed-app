import { useState } from "react";
import { triggerHaptic } from "@/lib/haptics";

interface SilkBookmarkRibbonProps {
  isPinned: boolean;
  onToggle: () => void;
  className?: string;
}

export function SilkBookmarkRibbon({
  isPinned,
  onToggle,
  className = "",
}: SilkBookmarkRibbonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("medium");
    onToggle();
  };

  // If unpinned and not hovered, we render a minimal ghost tab or reveal on container hover
  return (
    <div
      className={`absolute top-0 right-5 z-20 select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        title={isPinned ? "Unpin note (Remove bookmark)" : "Bookmark this note (Pin to top)"}
        className={`
          group relative transition-all duration-300 ease-out focus:outline-none cursor-pointer
          ${isPinned ? "translate-y-0 opacity-100" : isHovered ? "translate-y-0 opacity-70" : "-translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-60"}
        `}
        style={{
          width: "14px",
          height: isPinned ? "24px" : "18px",
        }}
      >
        {/* Minimal White Frosted Glass Bookmark Tab */}
        <div
          className={`
            w-full h-full relative overflow-hidden transition-all duration-300
            ${
              isPinned
                ? "bg-white/85 dark:bg-white/25 border border-white/70 dark:border-white/30 text-stone-700 dark:text-white"
                : "bg-white/60 dark:bg-white/15 border border-white/50 dark:border-white/20 text-stone-500 dark:text-stone-300"
            }
            backdrop-blur-md
          `}
          style={{
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 4.5px), 0 100%)",
            boxShadow: isPinned
              ? "0 4px 10px -1px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.08)"
              : "0 2px 4px rgba(0,0,0,0.08)",
          }}
        >
          {/* Top Sheen Reflection */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-b from-white/90 to-transparent pointer-events-none" />

          {/* Frosted Light Crease */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: `linear-gradient(
                90deg,
                rgba(255,255,255,0.1) 0%,
                rgba(255,255,255,0.6) 45%,
                rgba(0,0,0,0.08) 100%
              )`,
            }}
          />

          {/* Micro Accent Indicator when pinned */}
          {isPinned && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-0.5 bg-current opacity-40 rounded-full" />
          )}
        </div>

        {/* Soft Drop Shadow below the notch */}
        <div
          className={`
            absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-black/15 blur-[1.5px] rounded-full pointer-events-none transition-opacity
            ${isPinned ? "opacity-100" : "opacity-0"}
          `}
        />
      </button>
    </div>
  );
}
