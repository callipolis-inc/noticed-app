interface DateGroupDividerProps {
  dateKey: string;
  noteCount?: number;
  className?: string;
}

export function DateGroupDivider({
  dateKey,
  className = "",
}: DateGroupDividerProps) {
  return (
    <div
      className={`relative py-1 my-1 flex items-center justify-center gap-3 select-none ${className}`}
    >
      {/* Left Specular Hairline */}
      <div className="h-[1px] flex-1 max-w-[60px] sm:max-w-[88px] bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent opacity-80" />

      {/* Floating Literary Folio Pill */}
      <div className="inline-flex items-center gap-2   text-center transition-all">
        <span className="font-serif italic text-[14px] sm:text-[13.5px] text-[var(--text-secondary)] font-medium tracking-wide">
          {dateKey}
        </span>
      </div>

      {/* Right Specular Hairline */}
      <div className="h-[1px] flex-1 max-w-[60px] sm:max-w-[88px] bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent opacity-80" />
    </div>
  );
}
