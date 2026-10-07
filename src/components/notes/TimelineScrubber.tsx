import { useEffect, useState, useRef, FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";
import { Calendar } from "lucide-react";

interface TimelineGroup {
  dateKey: string;
  notes: { id: string }[];
}

interface TimelineScrubberProps {
  groups: TimelineGroup[];
  isReadingMode?: boolean;
}

function parseShortDateLabel(dateKey: string): { day: string; month: string } {
  // Typical dateKey: "7 October 2026"
  const parts = dateKey.trim().split(/\s+/);
  if (parts.length >= 2) {
    const day = parts[0];
    const month = parts[1].slice(0, 3).toUpperCase();
    return { day, month };
  }
  return { day: "", month: dateKey.slice(0, 3).toUpperCase() };
}

export const TimelineScrubber: FC<TimelineScrubberProps> = ({
  groups,
  isReadingMode = false,
}) => {
  const [activeDateKey, setActiveDateKey] = useState<string>(() => {
    return groups[0]?.dateKey || "";
  });
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  // Sync active section via IntersectionObserver
  useEffect(() => {
    if (groups.length < 3 || isReadingMode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible section closest to the top
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          const key = visible.target.getAttribute("data-date-key");
          if (key) {
            setActiveDateKey(key);
          }
        }
      },
      {
        rootMargin: "-15% 0px -65% 0px",
        threshold: [0, 0.2, 0.5],
      }
    );

    const sections = document.querySelectorAll<HTMLElement>(".date-group-section");
    sections.forEach((sec) => observer.observe(sec));

    return () => {
      sections.forEach((sec) => observer.unobserve(sec));
      observer.disconnect();
    };
  }, [groups, isReadingMode]);

  if (groups.length < 3 || isReadingMode) {
    return null;
  }

  const handleScrollToGroup = (dateKey: string) => {
    triggerHaptic("light");
    setActiveDateKey(dateKey);
    setHoveredDateKey(dateKey);

    const sectionId = `date-group-${encodeURIComponent(
      dateKey.toLowerCase().replace(/\s+/g, "-")
    )}`;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setHoveredDateKey(null);
    }, 1800);
  };

  const isDense = groups.length > 7;

  return (
    <aside
      aria-label="Timeline Chronological Scrubber"
      className="fixed right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-40 select-none flex items-center"
      style={{
        maxHeight: "calc(100dvh - 160px)",
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setHoveredDateKey(null);
      }}
    >
      {/* Floating Active/Hovered Tooltip Pill */}
      <AnimatePresence>
        {hoveredDateKey && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-full mr-2.5 px-3 py-1.5 rounded-2xl dynamic-island-shell text-[var(--text-primary)] border border-[var(--glass-border)] shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5 stroke-[2] text-[var(--text-secondary)]" />
            <div className="flex flex-col text-left">
              <span className="font-serif text-xs font-semibold tracking-tight">
                {hoveredDateKey}
              </span>
              <span className="text-[9.5px] font-sans text-[var(--text-tertiary)]">
                {groups.find((g) => g.dateKey === hoveredDateKey)?.notes.length || 0}{" "}
                notices
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrubber Vertical Rail */}
      <nav
        className="
          flex flex-col items-center gap-1.5 py-2 px-1
          rounded-full dynamic-island-shell
          border border-[var(--glass-border)]/60
          shadow-[0_8px_24px_-6px_rgba(0,0,0,0.2)]
          max-h-[55vh] overflow-y-auto no-scrollbar
          transition-all duration-200
        "
      >
        <div className="dynamic-island-specular-rim" />

        {groups.map((group) => {
          const isActive = activeDateKey === group.dateKey;
          const { day, month } = parseShortDateLabel(group.dateKey);

          return (
            <button
              key={group.dateKey}
              type="button"
              onClick={() => handleScrollToGroup(group.dateKey)}
              onMouseEnter={() => setHoveredDateKey(group.dateKey)}
              onTouchStart={() => setHoveredDateKey(group.dateKey)}
              aria-label={`Jump to ${group.dateKey}`}
              className={`
                group relative flex items-center justify-center
                transition-all duration-150 cursor-pointer
                ${
                  isExpanded || !isDense
                    ? "px-1.5 py-1 rounded-full min-w-[28px]"
                    : "w-5 h-5 rounded-full"
                }
                ${
                  isActive
                    ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-bold shadow-xs scale-105"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
                }
              `}
            >
              {isExpanded || !isDense ? (
                <div className="flex flex-col items-center leading-none">
                  {day && (
                    <span className="text-[10px] font-mono tracking-tighter">
                      {day}
                    </span>
                  )}
                  <span
                    className={`text-[8.5px] uppercase tracking-wider ${
                      isActive ? "font-bold" : "opacity-75"
                    }`}
                  >
                    {month}
                  </span>
                </div>
              ) : (
                /* Compact Dot when rail is condensed */
                <span
                  className={`
                    w-1.5 h-1.5 rounded-full transition-all
                    ${
                      isActive
                        ? "bg-[var(--accent-ink)] scale-125"
                        : "bg-[var(--text-secondary)]/50 group-hover:bg-[var(--text-primary)] group-hover:scale-125"
                    }
                  `}
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
