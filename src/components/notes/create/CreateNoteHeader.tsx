import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space } from "@/types";
import { triggerHaptic } from "@/lib/haptics";
import { formatTimeOnly } from "@/lib/utils";
import { X, Check, ChevronDown } from "lucide-react";

interface CreateNoteHeaderProps {
  spaces: Space[];
  selectedSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
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
  onSelectSpace,
  noteDate,
  setNoteDate,
  noteTime,
  setNoteTime,
  canSave,
  isEditing,
  onClose,
  onSave,
}: CreateNoteHeaderProps) {
  const [showSpacePicker, setShowSpacePicker] = useState(false);

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
        className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs shrink-0"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>

      {/* Tengah: Notebook Picker & Date/Time strictly 1 BARIS */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 flex-1 text-center">
        {/* Space Picker */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setShowSpacePicker((prev) => !prev);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 transition-opacity cursor-pointer group"
          >
            <span className="truncate max-w-[110px] sm:max-w-[140px]">
              {currentSpace?.name || "Field Notes"}
            </span>
            <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-transform" />
          </button>

          {/* Space Picker Dropdown Menu */}
          <AnimatePresence>
            {showSpacePicker && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowSpacePicker(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 max-h-56 overflow-y-auto z-40 rounded-2xl bg-[var(--sheet-bg)] border border-[var(--glass-border)] shadow-2xl p-1.5 flex flex-col gap-0.5 backdrop-blur-xl"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--glass-border)]/50 mb-1">
                    Select Space
                  </div>
                  {spaces.map((sp) => {
                    const isSelected = sp.id === selectedSpaceId;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          onSelectSpace(sp.id);
                          setShowSpacePicker(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[var(--text-primary)]/10 font-semibold text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="truncate">{sp.name}</span>
                        {isSelected && (
                          <Check className="w-3 h-3 stroke-[2.5] text-[var(--text-primary)] shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

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
          className="px-3.5 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center gap-1 disabled:opacity-30 active:scale-95 transition-transform cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.12)] shrink-0"
          title={isEditing ? "Save changes" : "Notice into timeline"}
        >
          <span>{isEditing ? "Save" : "Notice"}</span>
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </header>
  );
}
