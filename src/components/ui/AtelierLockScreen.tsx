import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { Lock, Unlock, ShieldCheck, KeyRound } from "lucide-react";

interface AppLockScreenProps {
  isLocked: boolean;
  userName: string;
  onUnlock: () => void;
  savedPin: string | null;
}

export function AppLockScreen({
  isLocked,
  userName = "Afa",
  onUnlock,
  savedPin,
}: AppLockScreenProps) {
  const [pinInput, setPinInput] = useState("");
  const [isErrorShake, setIsErrorShake] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      setCurrentDate(
        now.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSimpleUnlock = () => {
    triggerSuccessHaptic();
    onUnlock();
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (savedPin && pinInput === savedPin) {
      triggerSuccessHaptic();
      setPinInput("");
      onUnlock();
    } else {
      triggerHaptic("heavy");
      setIsErrorShake(true);
      setTimeout(() => setIsErrorShake(false), 500);
      setPinInput("");
    }
  };

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-[var(--bg-base)] flex flex-col justify-between items-center p-6 select-none"
          style={{
            paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 24px), 36px)",
            paddingBottom:
              "max(calc(env(safe-area-inset-bottom, 0px) + 24px), 36px)",
          }}
        >
          {/* Top Lock Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass border border-[var(--glass-border)] text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Noticed Locked</span>
          </div>

          {/* Center Clock & Identity */}
          <div className="flex flex-col items-center text-center my-auto space-y-4 max-w-xs w-full">
            <div className="space-y-1">
              <div className="text-5xl sm:text-6xl font-serif font-light tracking-tight text-[var(--text-primary)]">
                {currentTime}
              </div>
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                {currentDate}
              </div>
            </div>

            {/* Monogram Seal */}
            <div className="pt-4 flex flex-col items-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-[var(--text-primary)] text-[var(--accent-ink)] font-serif font-bold text-2xl flex items-center justify-center shadow-lg">
                {userName.charAt(0).toUpperCase() || "A"}
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[var(--text-primary)]">
                  {userName || "Author"}
                </h2>
                <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Private Offline Archive</span>
                </div>
              </div>
            </div>

            {/* Unlock Trigger: Simple Tap vs 4-Digit PIN */}
            <div className="pt-4 w-full">
              {savedPin ? (
                <form
                  onSubmit={handlePinSubmit}
                  className={`space-y-3 ${
                    isErrorShake ? "animate-shake" : ""
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <KeyRound className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) =>
                        setPinInput(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="••••"
                      autoFocus
                      className="w-36 px-4 py-2 rounded-2xl liquid-glass text-center font-mono text-xl tracking-widest text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pinInput.length !== 4}
                    className="w-full py-3 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-xs tracking-wider uppercase disabled:opacity-40 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Unlock App</span>
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={handleSimpleUnlock}
                  className="w-full py-3.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-xs tracking-wider uppercase active:scale-95 hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4 stroke-[2]" />
                  <span>Tap to Unlock</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer Safe Note */}
          <div className="text-[10.5px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider opacity-60">
            Noticed Archival Security
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const AtelierLockScreen = AppLockScreen;
