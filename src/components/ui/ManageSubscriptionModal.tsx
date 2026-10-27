import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  RotateCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useAppLanguage } from "@/lib/i18n";
import {
  SubscriptionDetails,
  openStoreSubscriptionManagement,
  restoreAtelierPurchases,
} from "@/lib/purchases";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";

interface ManageSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  details?: SubscriptionDetails | null;
  userEmail?: string | null;
  onRestoreSuccess?: (details: SubscriptionDetails | null) => void;
}

export function ManageSubscriptionModal({
  isOpen,
  onClose,
  details,
  userEmail,
  onRestoreSuccess,
}: ManageSubscriptionModalProps) {
  useLockBodyScroll(isOpen);
  const [currentLang, , t] = useAppLanguage();
  const tx = t.subscriptionSuccess;

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  const planId = details?.planId ?? "lifetime";
  const isLifetime = details?.isLifetime || planId === "lifetime" || !details?.expiresAt;

  const planName = useMemo(() => {
    if (planId === "monthly") {
      return currentLang === "id" ? "Edisi Bulanan (Monthly)" : "Monthly Edition";
    }
    if (planId === "annual") {
      return currentLang === "id" ? "Edisi Tahunan (Annual Folio)" : "Annual Folio";
    }
    return currentLang === "id" ? "Patron (Akses Seumur Hidup)" : "Patron (Lifetime Access)";
  }, [planId, currentLang]);

  // Format expiration / renewal date
  const formattedExpiry = useMemo(() => {
    if (isLifetime || !details?.expiresAt) {
      return tx.lifetimeValidity;
    }
    try {
      const date = new Date(details.expiresAt);
      return date.toLocaleDateString(
        currentLang === "id" ? "id-ID" : "en-US",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );
    } catch {
      return details.expiresAt;
    }
  }, [details?.expiresAt, isLifetime, currentLang, tx.lifetimeValidity]);

  const handleRestore = async () => {
    triggerHaptic("medium");
    setIsRestoring(true);
    setRestoreFeedback(null);
    try {
      const res = await restoreAtelierPurchases(userEmail);
      if (res.isPro) {
        triggerSuccessHaptic();
        setRestoreFeedback(
          currentLang === "id"
            ? "Keanggotaan berhasil disinkronkan dari Apple ID."
            : "Membership successfully resynced from Apple ID."
        );
        onRestoreSuccess?.(res.details || null);
      } else {
        triggerHaptic("light");
        setRestoreFeedback(
          currentLang === "id"
            ? "Tidak ditemukan langganan aktif pada Apple ID ini."
            : "No active subscription found on this Apple ID."
        );
      }
    } catch (err: any) {
      console.warn("[ManageSubscriptionModal] Restore error:", err);
      setRestoreFeedback(
        currentLang === "id"
          ? "Gagal memulihkan. Periksa koneksi internet Anda."
          : "Failed to restore. Please check your connection."
      );
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 select-none pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-[10px]"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-full max-w-sm rounded-3xl dynamic-island-shell border border-[var(--glass-border)] shadow-2xl z-10 flex flex-col overflow-hidden text-left"
          style={{ backgroundColor: "var(--sheet-bg)" }}
        >
          {/* Top Specular Rim */}
          <div className="dynamic-island-specular-rim" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)]/40 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-primary)]">
                <RotateCw className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <h2 className="text-[14.5px] font-semibold text-[var(--text-primary)] tracking-tight">
                {t.settings.manageSubscription}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] no-scrollbar">
            {/* 1. Active Plan Overview Card */}
            <div className="p-3.5 rounded-2xl bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-widest uppercase font-mono text-[var(--text-tertiary)]">
                  {t.settings.activePlan}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-[var(--text-primary)]/10 text-[var(--text-primary)]">
                  <Sparkles className="w-2.5 h-2.5" />
                  Atelier Pro
                </span>
              </div>

              <div className="font-serif text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">
                {planName}
              </div>

              <div className="pt-1 flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-sans border-t border-[var(--glass-border)]/30">
                <Calendar className="w-3.5 h-3.5 stroke-[1.8] text-[var(--text-tertiary)] shrink-0" />
                <span className="leading-tight">
                  {isLifetime ? (
                    <span className="text-[var(--text-primary)] font-medium">
                      {tx.lifetimeValidity}
                    </span>
                  ) : (
                    <span>
                      {t.settings.autoRenewalActive}:{" "}
                      <strong className="text-[var(--text-primary)] font-medium">
                        {formattedExpiry}
                      </strong>
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* 2. Apple Auto-Renewal Management (Only for Recurring Plans) */}
            {!isLifetime ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)]/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>{t.settings.cancelSubsTitle}</span>
                  </div>
                  <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
                    {t.settings.autoRenewalNotice}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerSuccessHaptic();
                    openStoreSubscriptionManagement();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2]" />
                  <span>{t.settings.openStoreSettings}</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)]/40 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span>{tx.lifetimeValidity}</span>
                </div>
                <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
                  {t.settings.lifetimeNotice}
                </p>
              </div>
            )}

            {/* 3. Restore Purchases Action (Unified into this same sheet) */}
            <div className="pt-2 border-t border-[var(--glass-border)]/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium text-[var(--text-primary)]">
                    {t.settings.restoreApplePurchases}
                  </div>
                  <div className="text-[9.5px] text-[var(--text-tertiary)] max-w-[210px] leading-tight">
                    {t.settings.restoreApplePurchasesDesc}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleRestore}
                  className="px-3 py-1.5 rounded-full inner-pseudo-glass text-[10.5px] font-medium text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {isRestoring ? (
                    <>
                      <RotateCw className="w-3 h-3 animate-spin" />
                      <span>{t.settings.restoring}</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-3 h-3 text-[var(--text-secondary)]" />
                      <span>{t.settings.restoreButton}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Restore Real-time Feedback Banner */}
              {restoreFeedback && (
                <div className="p-2 rounded-lg bg-[var(--text-primary)]/5 text-[10px] font-sans text-center text-[var(--text-secondary)] leading-tight">
                  {restoreFeedback}
                </div>
              )}
            </div>
          </div>

          {/* Footer Dismiss Button */}
          <div className="p-4 border-t border-[var(--glass-border)]/40 bg-[var(--sheet-bg)] shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="w-full py-2.5 rounded-xl inner-pseudo-glass text-[var(--text-primary)] text-xs font-medium active:scale-[0.98] transition-transform cursor-pointer text-center"
            >
              {t.common.done}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
