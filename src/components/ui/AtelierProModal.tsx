import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Video, Music, Image as ImageIcon, Cloud, X, Check } from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { setProUser, useProStatus } from "@/lib/proManager";

interface AtelierProModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerFeature?: "video" | "audio_import" | "unlimited_photos" | null;
}

export function AtelierProModal({
  isOpen,
  onClose,
  triggerFeature,
}: AtelierProModalProps) {
  const isPro = useProStatus();

  if (!isOpen) return null;

  const handleUnlockPro = () => {
    triggerSuccessHaptic();
    setProUser(true);
    onClose();
  };

  const featureDescriptions = {
    video: "Motion & video clip captures are an exclusive Atelier Pro folio feature.",
    audio_import: "Importing audio & voice memo files is an exclusive Atelier Pro feature.",
    unlimited_photos: "Standard folio holds up to 3 photos per notice. Upgrade to Atelier Pro for unlimited gallery curation.",
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none">
        {/* Dimming Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="fixed inset-0 bg-black/45 backdrop-blur-md pointer-events-auto"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: -24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="
            pointer-events-auto relative w-full max-w-sm sm:max-w-md
            rounded-[32px] overflow-hidden z-10 flex flex-col
            bg-[var(--sheet-bg)]
            backdrop-blur-[40px] saturate-[190%]
            border border-[var(--glass-border)]
            shadow-[0_28px_64px_-12px_rgba(0,0,0,0.28),0_8px_24px_-4px_rgba(0,0,0,0.1)]
            text-[var(--text-primary)]
            p-5 sm:p-6
          "
          style={{
            marginTop: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)",
            maxHeight: "calc(100dvh - max(calc(env(safe-area-inset-top, 0px) + 14px), 24px) - 24px)",
          }}
        >
          {/* Top Specular Rim */}
          <div className="dynamic-island-specular-rim" />

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="absolute top-4 right-4 w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
            title="Close"
          >
            <X className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          {/* Header Seal */}
          <div className="text-center pt-2 pb-4 space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] shadow-sm mb-1 text-[var(--text-primary)]">
              <Sparkles className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--text-tertiary)] font-semibold">
              Atelier Membership
            </div>
            <h2 className="font-serif text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--text-primary)]">
              Atelier Pro
            </h2>
            <p className="font-serif italic text-xs sm:text-[13px] text-[var(--text-secondary)] max-w-xs mx-auto">
              {triggerFeature && featureDescriptions[triggerFeature]
                ? featureDescriptions[triggerFeature]
                : "Elevate your private chronicle with unconstrained multimedia expression."}
            </p>
          </div>

          {/* Features Roster */}
          <div className="space-y-2.5 my-2">
            {[
              {
                icon: Video,
                title: "Cinematic Video Clips",
                desc: "Record & attach motion vignettes up to 30s with inline playback.",
              },
              {
                icon: Music,
                title: "Studio Audio Import",
                desc: "Import external voice & audio files (.m4a, .mp3, .wav) up to 2 minutes.",
              },
              {
                icon: ImageIcon,
                title: "Unlimited Visual Folio",
                desc: "Curate unlimited photos per notice across custom photostrip formats.",
              },
              {
                icon: Cloud,
                title: "Cloud Media Archive",
                desc: "Full automated cloud storage sync across all your mobile workspaces.",
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-2xl apple-card border border-[var(--glass-border)]/50"
                >
                  <div className="w-7 h-7 rounded-xl inner-pseudo-glass flex items-center justify-center shrink-0 mt-0.5 text-[var(--text-primary)]">
                    <Icon className="w-3.5 h-3.5 stroke-[1.8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-[11px] text-[var(--text-tertiary)] font-sans leading-tight mt-0.5">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="pt-4 mt-auto space-y-2">
            <button
              type="button"
              onClick={handleUnlockPro}
              className="w-full py-3 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer shadow-[0_4px_14px_rgba(0,0,0,0.14)]"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isPro ? "Atelier Pro Is Active" : "Activate Atelier Pro (Lifetime)"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="w-full py-1.5 text-center text-[11px] font-sans font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Continue with Standard Folio
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
