import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, AlertCircle, RotateCcw } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface DynamicFlyoutProps {
  message: string | null;
  type?: "success" | "info" | "warning";
  actionLabel?: string | null;
  onAction?: (() => void) | null;
  onClose?: () => void;
}

export function DynamicFlyout({
  message,
  type = "info",
  actionLabel,
  onAction,
  onClose,
}: DynamicFlyoutProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          onClick={onClose}
          className="fixed left-4 right-4 max-w-sm mx-auto z-[9999] pointer-events-auto cursor-pointer"
          style={{
            top: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)",
          }}
        >
          <div className="flex items-center justify-between gap-2.5 px-4 py-2 rounded-full liquid-glass-strong shadow-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              {type === "success" && (
                <CheckCircle2
                  className="w-4 h-4 text-[var(--text-primary)] shrink-0"
                  strokeWidth={2}
                />
              )}
              {type === "info" && (
                <Sparkles
                  className="w-4 h-4 text-[var(--text-primary)] shrink-0"
                  strokeWidth={2}
                />
              )}
              {type === "warning" && (
                <AlertCircle
                  className="w-4 h-4 text-[var(--text-secondary)] shrink-0"
                  strokeWidth={2}
                />
              )}
              <p className="text-xs font-sans font-medium text-[var(--text-primary)] tracking-wide truncate">
                {message}
              </p>
            </div>

            {actionLabel && onAction && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("medium");
                  onAction();
                }}
                className="px-2.5 py-1 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-[11px] font-sans font-semibold tracking-wide flex items-center gap-1 shrink-0 active:scale-95 transition-transform cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                <span>{actionLabel}</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

