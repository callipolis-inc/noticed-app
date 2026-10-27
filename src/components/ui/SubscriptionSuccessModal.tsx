import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  Video,
  Music,
  Printer,
  ShieldCheck,
  Calendar,
  Layers,
  User,
  X,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import { triggerSuccessHaptic, triggerHaptic } from "@/lib/haptics";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useAppLanguage } from "@/lib/i18n";
import { SubscriptionDetails, openStoreSubscriptionManagement } from "@/lib/purchases";

interface SubscriptionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  details?: SubscriptionDetails | null;
}

function formatDate(dateStr: string | null | undefined, lang: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function SubscriptionSuccessModal({
  isOpen,
  onClose,
  details,
}: SubscriptionSuccessModalProps) {
  useLockBodyScroll(isOpen);
  const [currentLang, , t] = useAppLanguage();
  const tx = t.subscriptionSuccess;
  const [isManageConfirmOpen, setIsManageConfirmOpen] = useState(false);

  const planId = details?.planId ?? "lifetime";
  const isLifetime = details?.isLifetime || planId === "lifetime" || !details?.expiresAt;

  const localizedPlanName = useMemo(() => {
    if (planId === "monthly") {
      return currentLang === "id" ? "Edisi Bulanan (Monthly)" : "Monthly Edition";
    }
    if (planId === "annual") {
      return currentLang === "id" ? "Edisi Tahunan (Annual Folio)" : "Annual Folio";
    }
    return currentLang === "id" ? "Patron (Akses Seumur Hidup)" : "Patron (Lifetime Access)";
  }, [planId, currentLang]);

  const formattedExpiry = useMemo(() => {
    if (isLifetime || !details?.expiresAt) {
      return tx.lifetimeValidity;
    }
    const formatted = formatDate(details.expiresAt, currentLang);
    return details.willRenew
      ? tx.renewsOn.replace("{date}", formatted)
      : tx.expiresOn.replace("{date}", formatted);
  }, [details, isLifetime, currentLang, tx]);

  const privileges = useMemo(
    () => [
      {
        icon: BookOpen,
        title: currentLang === "id" ? "Volume & Bab Tanpa Batas" : "Unlimited Volumes & Chapters",
        desc:
          currentLang === "id"
            ? "Bebas mengarsipkan ratusan buku catatan tanpa batas rak 3 volume."
            : "Archive hundreds of notebooks beyond the 3-volume bookshelf limit.",
      },
      {
        icon: ImageIcon,
        title: currentLang === "id" ? "Galeri Foto Polaroid Tak Terbatas" : "Boundless Photographs & Polaroids",
        desc:
          currentLang === "id"
            ? "Semua lembar catatan bebas disematkan banyak foto resolusi tinggi."
            : "Embed boundless high-resolution visual moments on every page.",
      },
      {
        icon: Video,
        title: currentLang === "id" ? "Klip Video Bergerak (30 Detik)" : "30s Motion Video Vignettes",
        desc:
          currentLang === "id"
            ? "Abadikan momen bergerak sinematik langsung di dalam catatan Anda."
            : "Capture cinematic memory vignettes directly inside your field notes.",
      },
      {
        icon: Music,
        title: currentLang === "id" ? "Audio Studio & Memo 3 Menit" : "Studio Audio & 3-Min Memos",
        desc:
          currentLang === "id"
            ? "Impor rekaman suara luar dan memo audio durasi panjang berdefinisi tinggi."
            : "Import external audio files and record high-fidelity extended memos.",
      },
      {
        icon: Printer,
        title: currentLang === "id" ? "Ekspor Manuskrip Folio Cetak (PDF)" : "Print-Ready Folio Manuscript Export",
        desc:
          currentLang === "id"
            ? "Cetak dan terbitkan seluruh isi buku ke format PDF folio elegan."
            : "Export and publish your completed journal to high-res PDF manuscripts.",
      },
      {
        icon: Sparkles,
        title: currentLang === "id" ? "Stempel Daun Emas (Luxury Foil)" : "Luxury Foil Spine Stamping",
        desc:
          currentLang === "id"
            ? "Hiasi sampul dan punggung buku dengan kilau emas, perak, dan zamrud."
            : "Adorn notebook spines and covers with radiant metallic foil stamping.",
      },
    ],
    [currentLang],
  );

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const handleDismiss = () => {
    triggerSuccessHaptic();
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex items-center justify-center p-3.5 sm:p-4 pointer-events-none">
        {/* Adaptive Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-black/40 backdrop-blur-xl pointer-events-auto"
        />

        {/* Liquid Glass Editorial Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="
            pointer-events-auto relative w-full max-w-[380px] max-h-[90vh]
            rounded-[34px] overflow-hidden z-10 flex flex-col
            bg-[var(--sheet-bg)]/90
            backdrop-blur-3xl saturate-[190%]
            border border-[var(--glass-border)]
            shadow-[0_16px_40px_-10px_rgba(0,0,0,0.14),0_0_1px_1px_rgba(255,255,255,0.15)]
            text-[var(--text-primary)]
            p-5 space-y-3.5
          "
        >
          {/* Subtle Glass Rim Reflection */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--text-primary)]/20 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="
              absolute top-3.5 right-3.5 w-7 h-7 rounded-full
              bg-[var(--text-primary)]/[0.06] hover:bg-[var(--text-primary)]/12
              border border-[var(--glass-border)]/60
              active:scale-90 transition-all flex items-center justify-center
              text-[var(--text-secondary)] hover:text-[var(--text-primary)]
              cursor-pointer z-30
            "
          >
            <X className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          {/* Scrollable Content Container */}
          <div className="overflow-y-auto no-scrollbar space-y-3.5 pr-0.5">
            {/* Header */}
            <div className="text-center pt-0.5 space-y-1">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[var(--text-primary)]/[0.06] border border-[var(--glass-border)] shadow-xs mb-0.5 text-[var(--text-primary)]">
                <Sparkles className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--text-tertiary)] font-semibold">
                {tx.badge}
              </div>
              <h2 className="font-serif text-[23px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                {tx.title}
              </h2>
              <p className="text-[11.5px] text-[var(--text-secondary)] max-w-[300px] mx-auto leading-relaxed pt-0.5">
                {tx.subtitle}
              </p>
            </div>

            {/* Membership Details Box */}
            <div className="rounded-2xl bg-[var(--text-primary)]/[0.04] border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]/50 overflow-hidden">
              {/* Row 1: Plan Tier */}
              <div className="p-3 flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Layers className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span>{tx.tierLabel}</span>
                </div>
                <span className="font-semibold text-[var(--text-primary)]">
                  {localizedPlanName}
                </span>
              </div>

              {/* Row 2: Validity / Duration */}
              <div className="p-3 flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Calendar className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span>{tx.validityLabel}</span>
                </div>
                <span className="font-semibold text-[var(--text-primary)] text-right">
                  {formattedExpiry}
                </span>
              </div>

              {/* Row 3: Verification Status */}
              <div className="p-3 flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span>{tx.statusLabel}</span>
                </div>
                <span className="font-semibold text-[var(--text-primary)]">
                  {tx.verifiedByStore}
                </span>
              </div>

              {/* Row 4: Linked Account (if present) */}
              {details?.userEmail && (
                <div className="p-3 flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <User className="w-3.5 h-3.5 stroke-[1.8]" />
                    <span>{tx.accountLabel}</span>
                  </div>
                  <span className="font-mono text-[10.5px] text-[var(--text-primary)] truncate max-w-[180px]">
                    {details.userEmail}
                  </span>
                </div>
              )}
            </div>

            {/* Privileges Breakdown Section */}
            <div className="space-y-2 pt-0.5">
              <div className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--text-tertiary)] font-semibold px-0.5">
                {tx.privilegesTitle}
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {privileges.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2xl bg-[var(--text-primary)]/[0.04] border border-[var(--glass-border)] flex items-start gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-xl bg-[var(--text-primary)]/[0.06] border border-[var(--glass-border)]/60 text-[var(--text-primary)] flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] font-semibold text-[var(--text-primary)] leading-tight">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] leading-snug mt-0.5">
                          {p.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manage / Cancel Auto-Renewal Button (strictly hidden for lifetime) */}
            {!isLifetime && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    setIsManageConfirmOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[var(--text-primary)]/[0.04] hover:bg-[var(--text-primary)]/[0.07] border border-[var(--glass-border)] text-[var(--text-secondary)] text-[11px] font-medium flex items-center justify-between transition-colors cursor-pointer active:scale-[0.99]"
                >
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 stroke-[1.8]" />
                    <span>{t.settings.manageSubscription}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[1.8] opacity-60" />
                </button>
              </div>
            )}

            {/* Manage Notice Disclaimer (only for recurring plans) */}
            {!isLifetime && (
              <div className="text-[9.5px] text-center text-[var(--text-tertiary)] leading-tight px-3 pt-0.5">
                {tx.manageNotice}
              </div>
            )}
          </div>

          {/* Manage Auto-Renewal Confirmation Sheet Overlay */}
          <AnimatePresence>
            {isManageConfirmOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ type: "spring", damping: 28, stiffness: 340 }}
                className="absolute inset-0 z-30 p-5 sm:p-6 bg-[var(--sheet-bg)] backdrop-blur-3xl flex flex-col justify-between rounded-[34px] border border-[var(--glass-border)]"
              >
                <div className="space-y-3 pt-2">
                  <div className="w-9 h-9 rounded-2xl bg-[var(--text-primary)]/[0.06] border border-[var(--glass-border)] text-[var(--text-primary)] flex items-center justify-center mb-1">
                    <RotateCw className="w-4 h-4 stroke-[1.8]" />
                  </div>

                  <h3 className="font-serif text-[19px] font-semibold tracking-tight text-[var(--text-primary)]">
                    {t.settings.cancelSubsTitle}
                  </h3>

                  <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                    {t.settings.cancelSubsDesc
                      .replace("{store}", "Apple App Store")
                      .replace(
                        "{date}",
                        formatDate(details?.expiresAt, currentLang) ||
                          (currentLang === "id"
                            ? "akhir periode berjalan"
                            : "the end of current billing period"),
                      )}
                  </p>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      triggerSuccessHaptic();
                      openStoreSubscriptionManagement();
                    }}
                    className="w-full py-3 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold active:scale-[0.98] transition-transform cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <span>{t.settings.openStoreSettings}</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setIsManageConfirmOpen(false);
                    }}
                    className="w-full py-2.5 rounded-full inner-pseudo-glass text-[var(--text-primary)] text-[11.5px] font-medium active:scale-[0.98] transition-transform cursor-pointer text-center"
                  >
                    {t.settings.keepSubscription}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button CTA */}
          <div className="pt-2 border-t border-[var(--glass-border)]/50 mt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold tracking-wide active:scale-[0.98] transition-transform cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 stroke-[2]" />
              <span>{tx.ctaButton}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
