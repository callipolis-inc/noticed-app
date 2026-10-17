import { createPortal } from "react-dom";
import { Lock } from "lucide-react";

interface AppPrivacyShieldProps {
  isConcealed: boolean;
}

/**
 * Full-screen Privacy Shield rendered when the app transitions to the background
 * or the multitasking App Switcher deck is opened, concealing sensitive note
 * contents from OS snapshots.
 */
export function AppPrivacyShield({ isConcealed }: AppPrivacyShieldProps) {
  if (!isConcealed || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[var(--bg-base)] select-none pointer-events-auto"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center space-y-3 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--text-primary)]/8 border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-primary)] shadow-sm">
          <Lock className="w-5 h-5 stroke-[1.8]" />
        </div>
        <div className="space-y-0.5">
          <h1 className="font-serif text-base font-bold tracking-tight text-[var(--text-primary)]">
            Noticed
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
            Private Journal · Secured
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
