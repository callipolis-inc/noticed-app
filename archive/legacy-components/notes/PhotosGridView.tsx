import { useMemo } from "react";
import { FieldNote } from "@/types";
import { getDateGroupKey, formatTimeOnly } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { DateGroupDivider } from "./DateGroupDivider";
import { Image as ImageIcon, Camera } from "lucide-react";

interface PhotosGridViewProps {
  notes: FieldNote[];
  onOpenPhotostrip?: (note: FieldNote) => void;
}

export function PhotosGridView({
  notes,
  onOpenPhotostrip,
}: PhotosGridViewProps) {
  // Group photos by date
  const groupedPhotos = useMemo(() => {
    const groups: {
      dateKey: string;
      items: { url: string; note: FieldNote }[];
    }[] = [];
    const groupMap = new Map<string, { url: string; note: FieldNote }[]>();

    // Sort notes descending (terbaru lebih dahulu)
    const sorted = [...notes].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    for (const note of sorted) {
      if (!note.photos || note.photos.length === 0) continue;
      const key = getDateGroupKey(note.createdAt);

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
        groups.push({ dateKey: key, items: groupMap.get(key)! });
      }

      for (const url of note.photos) {
        groupMap.get(key)!.push({ url, note });
      }
    }

    return groups;
  }, [notes]);

  if (groupedPhotos.length === 0) {
    return (
      <div className="py-24 text-center space-y-3 select-none">
        <div className="w-12 h-12 rounded-2xl apple-card mx-auto flex items-center justify-center text-[var(--text-tertiary)] shadow-xs">
          <Camera className="w-5 h-5 opacity-60" />
        </div>
        <p className="text-sm font-serif italic text-[var(--text-tertiary)]">
          No captured photographs in this volume yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28 select-none">
      {groupedPhotos.map((group) => (
        <section key={group.dateKey} className="space-y-3">
          {/* Unified Folio Date Divider */}
          <DateGroupDivider
            dateKey={group.dateKey}
            noteCount={group.items.length}
          />

          {/* Frameless Apple-Style Liquid Photo Gallery Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
            {group.items.map((item, idx) => {
              const formattedTime = formatTimeOnly(item.note.createdAt);

              return (
                <div
                  key={`${item.note.id}-${idx}`}
                  onClick={() => {
                    triggerHaptic("light");
                    onOpenPhotostrip?.(item.note);
                  }}
                  className="
                    group relative cursor-pointer aspect-square rounded-2xl sm:rounded-3xl
                    overflow-hidden bg-black/5 active:scale-[0.98] transition-all duration-300
                    border border-[var(--glass-border)]/60
                    shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.04)]
                  "
                >
                  <img
                    src={item.url}
                    alt="Captured moment"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />

                  {/* Gentle Ambient Vignette & Timestamp Pill on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-end justify-between p-2.5">
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/90 drop-shadow-xs px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-xs">
                      {formattedTime}
                    </span>
                    <ImageIcon className="w-3.5 h-3.5 text-white/80 drop-shadow-xs" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
