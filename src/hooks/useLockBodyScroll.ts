import { useEffect } from "react";

let lockCount = 0;
let originalOverflow = "";

/**
 * Custom hook to lock body scrolling when a modal or sheet is open.
 * Uses a reference counter to safely support nested modals without restoring
 * scroll prematurely.
 */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [locked]);
}
