import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { Copy, Check, Sparkles, HeartHandshake, Link2, X } from "lucide-react";

interface SpacePairingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space | null;
  onUpdateSpace: (updated: Space) => void;
}

export function SpacePairingSheet({
  isOpen,
  onClose,
  space,
  onUpdateSpace,
}: SpacePairingSheetProps) {
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [partnerNameInput, setPartnerNameInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"invite" | "join">("invite");

  if (!space) return null;

  const currentInviteCode =
    space.inviteCode || `SN-COZY-${space.id.slice(-4).toUpperCase()}`;

  const handleCopyCode = async () => {
    triggerHaptic("light");
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentInviteCode);
        setCopied(true);
        triggerSuccessHaptic();
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCodeInput.trim()) return;

    triggerSuccessHaptic();
    const updated: Space = {
      ...space,
      isShared: true,
      partnerName: partnerNameInput.trim() || "Partner",
      membersCount: 2,
      inviteCode: partnerCodeInput.trim().toUpperCase(),
    };

    onUpdateSpace(updated);
    setPartnerCodeInput("");
    setPartnerNameInput("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none">
          {/* Subtle Ambient Dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="fixed inset-0 bg-black/35 backdrop-blur-[6px] pointer-events-auto"
          />

          {/* Top Floating Liquid Glass Island */}
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="
              pointer-events-auto relative w-full max-w-sm sm:max-w-md
              dynamic-island-shell overflow-hidden z-10 flex flex-col
              bg-white/95 dark:bg-[#18181c]/95 backdrop-blur-[40px] saturate-[190%]
              border border-[var(--glass-border)]
              shadow-[0_28px_64px_-12px_rgba(0,0,0,0.24),0_8px_24px_-4px_rgba(0,0,0,0.08)]
              text-[var(--text-primary)]
            "
            style={{
              marginTop:
                "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
              maxHeight:
                "calc(100dvh - max(calc(env(safe-area-inset-top, 0px) + 12px), 20px) - 24px)",
            }}
          >
            {/* Top Specular Rim Reflection */}
            <div className="dynamic-island-specular-rim" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--glass-border)]/40 shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                  Cozy Stash
                </span>
                <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[150px]">
                  · {space.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
              {/* Partner Status Card */}
              <div className="p-3.5 rounded-2xl apple-card flex items-center gap-3 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                <div className="w-10 h-10 rounded-xl bg-[var(--text-primary)]/8 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <HeartHandshake className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {space.partnerName
                      ? `Paired with ${space.partnerName}`
                      : "Collaborative Stash"}
                  </div>
                  <div className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">
                    {space.partnerName
                      ? "Notes are co-authored and synced across your devices."
                      : "Micro-journaling for couples and close friends."}
                  </div>
                </div>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="apple-segmented-track w-full flex">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("invite");
                  }}
                  className={`flex-1 apple-segmented-btn text-center !py-1.5 ${
                    activeTab === "invite"
                      ? "apple-segmented-btn-active font-semibold"
                      : ""
                  }`}
                >
                  Invite Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("join");
                  }}
                  className={`flex-1 apple-segmented-btn text-center !py-1.5 ${
                    activeTab === "join"
                      ? "apple-segmented-btn-active font-semibold"
                      : ""
                  }`}
                >
                  Pair Partner
                </button>
              </div>

              {/* TAB 1: INVITE */}
              {activeTab === "invite" && (
                <div className="space-y-3 pt-1">
                  <div className="p-4 rounded-2xl apple-card text-center space-y-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">
                      Your Space Code
                    </div>
                    <div className="text-xl font-mono font-bold tracking-widest text-[var(--text-primary)] select-all py-1">
                      {currentInviteCode}
                    </div>
                    <p className="text-[10.5px] text-[var(--text-tertiary)] max-w-xs mx-auto">
                      Share this pairing code with your partner to link this
                      notebook on their device.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] flex items-center justify-center gap-2 text-xs font-semibold active:scale-95 transition-transform shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                        <span>Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Pairing Code</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 2: JOIN / PAIR */}
              {activeTab === "join" && (
                <form onSubmit={handleJoinSubmit} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[var(--text-tertiary)] px-1">
                      Partner Code
                    </label>
                    <input
                      type="text"
                      value={partnerCodeInput}
                      onChange={(e) =>
                        setPartnerCodeInput(e.target.value.toUpperCase())
                      }
                      placeholder="SN-COZY-XXXX"
                      className="w-full px-3.5 py-2 rounded-xl apple-card font-mono tracking-wider text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[var(--text-tertiary)] px-1">
                      Partner Name
                    </label>
                    <input
                      type="text"
                      value={partnerNameInput}
                      onChange={(e) => setPartnerNameInput(e.target.value)}
                      placeholder="e.g. Maya, Alex"
                      className="w-full px-3.5 py-2 rounded-xl apple-card text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!partnerCodeInput.trim()}
                    className="w-full py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-40 active:scale-95 transition-transform shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer mt-2"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Link &amp; Sync Locally</span>
                  </button>
                </form>
              )}

              {/* Offline sync note */}
              <div className="pt-2 border-t border-[var(--glass-border)]/40 flex items-center justify-between text-[10.5px] font-mono text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 opacity-70" />
                  Cozy Stash Protocol
                </span>
                <span>Offline-First</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
