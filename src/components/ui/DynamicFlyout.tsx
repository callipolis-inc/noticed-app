import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, AlertCircle } from "lucide-react";

interface DynamicFlyoutProps {
  message: string | null;
  type?: "success" | "info" | "warning";
  onClose?: () => void;
}

export function DynamicFlyout({
  message,
  type = "info",
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
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full liquid-glass-strong shadow-xl">
            {type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-[var(--text-primary)] shrink-0" strokeWidth={2} />
            )}
            {type === "info" && (
              <Sparkles className="w-4 h-4 text-[var(--text-primary)] shrink-0" strokeWidth={2} />
            )}
            {type === "warning" && (
              <AlertCircle className="w-4 h-4 text-[var(--text-secondary)] shrink-0" strokeWidth={2} />
            )}
            <p className="text-xs font-sans font-medium text-[var(--text-primary)] tracking-wide truncate">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
