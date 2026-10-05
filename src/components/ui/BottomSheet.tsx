import {
  motion,
  AnimatePresence,
  type PanInfo,
  useDragControls,
} from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  zIndex?: number;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  zIndex = 50,
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined" || !window.visualViewport) {
      setKeyboardOffset(0);
      return;
    }

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = window.innerHeight - (vv.height + vv.offsetTop);
      const isKeyboardActive = offset > 80;
      setKeyboardOffset(isKeyboardActive ? Math.max(0, Math.round(offset)) : 0);
    };

    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, [isOpen]);

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            style={{ zIndex }}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetContainerRef}
            initial={{ y: "100%" }}
            animate={{
              y: 0,
              bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : "0px",
            }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 32,
              stiffness: 340,
              mass: 0.85,
            }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="
              fixed left-0 right-0 max-w-lg mx-auto
              flex flex-col
              rounded-t-[32px]
              bg-[var(--sheet-bg)] backdrop-blur-2xl
              border-t border-[var(--sheet-border)]
              shadow-2xl
              overflow-hidden
            "
            style={{
              zIndex: zIndex + 1,
              maxHeight: "92dvh",
              transition: "bottom 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Drag Handle Bar */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
            >
              <div className="w-10 h-1 rounded-full bg-[var(--text-tertiary)]/30" />
            </div>

            {/* Header (optional) */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-3 border-b border-[var(--glass-border)]">
                <h2 className="text-base font-display font-bold tracking-tight text-[var(--text-primary)]">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-[var(--glass-fill)] text-[var(--text-secondary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Scrollable Content */}
            <div
              ref={scrollContainerRef}
              className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
              }}
            >
              <div
                className="min-h-full px-6 py-4"
                style={{
                  paddingBottom:
                    keyboardOffset > 0
                      ? "20px"
                      : "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 28px)",
                }}
              >
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
