import { useMemo } from "react";
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
  CheckCircle2,
} from "lucide-react";
import { triggerSuccessHaptic } from "@/lib/haptics";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useAppLanguage } from "@/lib/i18n";
import { SubscriptionDetails } from "@/lib/purchases";

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

  const isLifetime = details?.isLifetime ?? false;
  const planId = details?.planId ?? "annual";

  const localizedPlanName = useMemo(() => {
    if (planId === "monthly") {
      return currentLang === "id" ? "Edisi Bulanan (Monthly)" : "Monthly Edition";
    }
    if (planId === "lifetime") {
      return currentLang === "id" ? "Patron (Akses Seumur Hidup)" : "Patron (Lifetime Access)";
    }
    return currentLang === "id" ? "Edisi Tahunan (Annual Folio)" : "Annual Folio";
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
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
        />

        {/* Celebratory Card Modal Shell */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", damping: 28, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[430px] max-h-[90vh] flex flex-col dynamic-island-shell rounded-3xl p-5 sm:p-6 overflow-hidden z-10 pointer-events-auto shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.14)]"
          style={{
            backgroundColor: "var(--bg-elevated, rgba(28, 28, 30, 0.94))",
          }}
        >
          {/* Subtle Ambient Golden Glow in the background */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10 text-[var(--text-secondary)] flex items-center justify-center cursor-pointer transition-colors z-20"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Scrollable Content Container */}
          <div className="overflow-y-auto no-scrollbar space-y-4 pr-0.5">
            {/* Hero Seal & Congratulatory Header */}
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              <div className="relative mb-3 flex items-center justify-center">
                {/* Rotating decorative halo */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400/25 via-amber-200/10 to-amber-500/30 p-[1.5px] shadow-[0_4px_16px_rgba(245,158,11,0.2)]">
                  <div className="w-full h-full rounded-full bg-[var(--bg-base)] flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-amber-400 stroke-[1.8]" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-semibold tracking-wider uppercase mb-1.5 font-mono">
                <span>{tx.badge}</span>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {tx.title}
              </h2>
              <p className="text-[12px] sm:text-[12.5px] text-[var(--text-secondary)] mt-1 max-w-[320px] leading-relaxed">
                {tx.subtitle}
              </p>
            </div>

            {/* Apple-style Membership Details Box */}
            <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]">
              {/* Row 1: Plan Tier */}
              <div className="p-3 flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Layers className="w-3.5 h-3.5 stroke-[1.8] text-amber-400" />
                  <span>{tx.tierLabel}</span>
                </div>
                <span className="font-semibold text-[var(--text-primary)]">
                  {localizedPlanName}
                </span>
              </div>

              {/* Row 2: Validity / Duration */}
              <div className="p-3 flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Calendar className="w-3.5 h-3.5 stroke-[1.8] text-amber-400" />
                  <span>{tx.validityLabel}</span>
                </div>
                <span className="font-semibold text-[var(--text-primary)] text-right">
                  {formattedExpiry}
                </span>
              </div>

              {/* Row 3: Verification Status */}
              <div className="p-3 flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[1.8] text-emerald-400" />
                  <span>{tx.statusLabel}</span>
                </div>
                <span className="font-medium text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                  <span>{tx.verifiedByStore}</span>
                </span>
              </div>

              {/* Row 4: Linked Account (if present) */}
              {details?.userEmail && (
                <div className="p-3 flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <User className="w-3.5 h-3.5 stroke-[1.8] text-amber-400" />
                    <span>{tx.accountLabel}</span>
                  </div>
                  <span className="font-mono text-[10.5px] text-[var(--text-primary)] truncate max-w-[180px]">
                    {details.userEmail}
                  </span>
                </div>
              )}
            </div>

            {/* Privileges Breakdown Section */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase font-mono px-1">
                {tx.privilegesTitle}
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {privileges.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)]/40 flex items-start gap-2.5"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 stroke-[2]" />
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

            {/* Manage Notice Disclaimer */}
            <div className="text-[9.5px] text-center text-[var(--text-tertiary)] leading-tight px-3 pt-1">
              {tx.manageNotice}
            </div>
          </div>

          {/* Action Button CTA */}
          <div className="pt-3 border-t border-[var(--glass-border)]/40 mt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-[12.5px] font-semibold active:scale-[0.98] transition-transform cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 stroke-[2.2]" />
              <span>{tx.ctaButton}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
