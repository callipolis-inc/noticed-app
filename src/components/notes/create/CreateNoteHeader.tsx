import { Space } from "@/types";
import { triggerHaptic } from "@/lib/haptics";
import { formatTimeOnly } from "@/lib/utils";
import { X, Check } from "lucide-react";

interface CreateNoteHeaderProps {
  spaces: Space[];
  selectedSpaceId: string;
  onSelectSpace?: (spaceId: string) => void;
  noteDate: string;
  setNoteDate: (date: string) => void;
  noteTime: string;
  setNoteTime: (time: string) => void;
  canSave: boolean;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function CreateNoteHeader({
  spaces,
  selectedSpaceId,
  noteDate,
  setNoteDate,
  noteTime,
  setNoteTime,
  canSave,
  isEditing,
  onClose,
  onSave,
}: CreateNoteHeaderProps) {
  const currentSpace =
    spaces.find((s) => s.id === selectedSpaceId) || spaces[0];

  const previewDateObj = new Date(`${noteDate}T${noteTime || "00:00"}`);
  const validPreviewDate = !isNaN(previewDateObj.getTime())
    ? previewDateObj
    : new Date();
  const formattedPreviewTime = formatTimeOnly(validPreviewDate);
  const formattedPreviewDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(validPreviewDate);

  return (
    <header className="px-4 py-3 border-b border-[var(--glass-border)]/50 flex items-center justify-between gap-2 shrink-0 relative z-20 bg-[var(--sheet-bg)]/80 backdrop-blur-md">
      {/* Kiri: Close Button */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          onClose();
        }}
        aria-label="Batalkan dan tutup editor catatan"
        className="relative w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs shrink-0 before:absolute before:-inset-2 before:content-['']"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>

      {/* Tengah: Notebook Name & Date/Time strictly 1 BARIS */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 flex-1 text-center">
        {/* Notebook Name (Plain Text) */}
        <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[110px] sm:max-w-[140px] shrink-0">
          {currentSpace?.name || "Field Notes"}
        </span>

        <span className="text-[11px] text-[var(--text-tertiary)] opacity-40 select-none">
          ·
        </span>

        {/* Inline Date & Time */}
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] font-sans not-italic select-none truncate">
          <label
            className="relative inline-flex items-center cursor-pointer hover:text-[var(--text-primary)] transition-colors truncate"
            title="Change date"
          >
            <span>{formattedPreviewDate}</span>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          <span className="opacity-40">·</span>

          <label
            className="relative inline-flex items-center cursor-pointer hover:text-[var(--text-primary)] transition-colors"
            title="Change time"
          >
            <span>{formattedPreviewTime}</span>
            <input
              type="time"
              value={noteTime}
              onChange={(e) => setNoteTime(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      {/* Kanan: Primary Action (Notice / Save) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          aria-label={
            isEditing
              ? "Simpan perubahan catatan"
              : "Terbitkan catatan baru ke timeline"
          }
          className="relative px-3.5 py-1.5 min-h-[36px] rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center gap-1 disabled:opacity-30 active:scale-95 transition-transform cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.12)] shrink-0 before:absolute before:-inset-1 before:content-['']"
          title={isEditing ? "Save changes" : "Notice into timeline"}
        >
          <span>{isEditing ? "Save" : "Notice"}</span>
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </header>
  );
}
