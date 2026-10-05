import { useRef, useEffect } from "react";
import { triggerHaptic } from "@/lib/haptics";
import { Calendar, Filter, Compass } from "lucide-react";

export interface TimelineDateItem {
  dateKey: string;
  count: number;
}

interface TimelineScrubberProps {
  dates: TimelineDateItem[];
  activeDateKey: string;
  selectedFilter: string | null; // null = show all
  filterMode: boolean; // true = filter stream, false = jump/scroll stream
  onToggleFilterMode: () => void;
  onSelectDate: (dateKey: string | null) => void;
  onJumpToDate: (dateKey: string) => void;
}

export function TimelineScrubber({
  dates,
  activeDateKey,
  selectedFilter,
  filterMode,
  onToggleFilterMode,
  onSelectDate,
  onJumpToDate,
}: TimelineScrubberProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active pill horizontally without vertical window scroll hitching
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetKey = filterMode
      ? selectedFilter || "ALL"
      : activeDateKey || "ALL";

    const activeEl = container.querySelector(
      `[data-date-key="${targetKey}"]`
    ) as HTMLElement | null;

    if (activeEl) {
      const targetScroll =
        activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  }, [activeDateKey, selectedFilter, filterMode]);

  if (dates.length === 0) return null;

  const totalCount = dates.reduce((acc, curr) => acc + curr.count, 0);

  const handlePillClick = (key: string | null) => {
    triggerHaptic("light");
    if (key === null) {
      // Clear filter or scroll to very top in Jump mode
      onSelectDate(null);
      if (!filterMode) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (filterMode) {
      // In filter mode, toggle this filter
      onSelectDate(selectedFilter === key ? null : key);
    } else {
      // In jump mode, jump to section
      onJumpToDate(key);
    }
  };

  // Determine if ALL is the active pill
  const isAllActive = filterMode
    ? selectedFilter === null
    : !activeDateKey || activeDateKey === "ALL";

  return (
    <nav
      aria-label="Timeline navigation"
      className="w-full my-1.5 select-none"
    >
      <div className="flex items-center gap-2 p-1.5 rounded-full liquid-glass border border-[var(--glass-border)] shadow-xs">
        {/* Scrubber Prefix / Mode Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onToggleFilterMode();
          }}
          className={`
            shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium transition-all active:scale-95
            ${
              filterMode
                ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill)]"
            }
          `}
          title={
            filterMode
              ? "Filter Mode: Isolating single date. Tap to switch to Jump Mode."
              : "Jump Mode: Tap to scroll to date. Tap here to switch to Filter Mode."
          }
        >
          {filterMode ? (
            <>
              <Filter className="w-3 h-3 stroke-[2]" />
              <span className="hidden sm:inline">Filter</span>
            </>
          ) : (
            <>
              <Compass className="w-3 h-3 stroke-[1.75]" />
              <span className="hidden sm:inline">Timeline</span>
            </>
          )}
        </button>

        {/* Separator hairline */}
        <div className="w-px h-3.5 bg-[var(--glass-border)] shrink-0" />

        {/* Horizontal Scrollable Date Track */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
        >
          {/* "ALL" Pill */}
          <button
            type="button"
            data-date-key="ALL"
            onClick={() => handlePillClick(null)}
            className={`
              shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-sans font-medium tracking-wider uppercase transition-all flex items-center gap-1
              ${
                isAllActive
                  ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill)]"
              }
            `}
          >
            <span>ALL</span>
            <span
              className={`
                text-[9.5px] px-1 rounded-full font-mono
                ${
                  isAllActive
                    ? "bg-[var(--accent-ink)]/20 text-[var(--accent-ink)]"
                    : "bg-[var(--text-primary)]/10 text-[var(--text-secondary)]"
                }
              `}
            >
              {totalCount}
            </span>
          </button>

          {/* Each Date Pill */}
          {dates.map((d) => {
            const isHighlight = filterMode
              ? selectedFilter === d.dateKey
              : activeDateKey === d.dateKey;

            return (
              <button
                key={d.dateKey}
                type="button"
                data-date-key={d.dateKey}
                onClick={() => handlePillClick(d.dateKey)}
                className={`
                  shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-sans tracking-wider uppercase transition-all flex items-center gap-1.5
                  ${
                    isHighlight
                      ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill)]"
                  }
                `}
                title={
                  filterMode
                    ? `Filter only ${d.dateKey} (${d.count} notes)`
                    : `Scroll to ${d.dateKey} (${d.count} notes)`
                }
              >
                <span>{d.dateKey}</span>
                <span
                  className={`
                    text-[9.5px] px-1 rounded-full font-mono
                    ${
                      isHighlight
                        ? "bg-[var(--accent-ink)]/20 text-[var(--accent-ink)]"
                        : "bg-[var(--text-primary)]/10 text-[var(--text-secondary)]"
                    }
                  `}
                >
                  {d.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Date Icon on Right */}
        <div className="shrink-0 pl-1 pr-1.5 text-[var(--text-tertiary)] hidden sm:flex items-center">
          <Calendar className="w-3.5 h-3.5 stroke-[1.75]" />
        </div>
      </div>
    </nav>
  );
}
