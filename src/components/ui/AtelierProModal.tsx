import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Video,
  Music,
  Image as ImageIcon,
  Cloud,
  X,
  Check,
  Crown,
  BookOpen,
  Printer,
  RotateCw,
} from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { useProStatus, ProFeature } from "@/lib/proManager";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { purchaseAtelierPlan, restoreAtelierPurchases } from "@/lib/purchases";
import { LegalModal, LegalTab } from "./LegalModal";

interface AtelierProModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerFeature?: ProFeature | null;
}

type PricingPlanId = "monthly" | "annual" | "lifetime";

interface PricingPlan {
  id: PricingPlanId;
  name: string;
  price: string;
  period: string;
  subtext: string;
  badge?: string;
  isPopular?: boolean;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "lifetime",
    name: "All-Time Patron",
    price: "Rp 499.000",
    period: "sekali bayar",
    subtext: "Bebas langganan selamanya · Milik Anda abadi",
    badge: "👑 Patron Pass",
    isPopular: true,
  },
  {
    id: "annual",
    name: "Annual Folio",
    price: "Rp 299.000",
    period: "/ tahun",
    subtext: "Setara Rp 24.900 / bulan (Hemat 36%)",
    badge: "Hemat 36%",
  },
  {
    id: "monthly",
    name: "Monthly Scribe",
    price: "Rp 39.000",
    period: "/ bulan",
    subtext: "Fleksibel tanpa komitmen jangka panjang",
  },
];

export function AtelierProModal({
  isOpen,
  onClose,
  triggerFeature,
}: AtelierProModalProps) {
  useLockBodyScroll(isOpen);

  const isPro = useProStatus();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanId>("lifetime");
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>("terms");
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseStatusMsg, setPurchaseStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlockPro = async () => {
    if (isPro) {
      onClose();
      return;
    }

    setIsProcessing(true);
    setPurchaseStatusMsg(null);
    triggerHaptic("medium");

    try {
      const res = await purchaseAtelierPlan(selectedPlan);
      if (res.isPro) {
        triggerSuccessHaptic();
        setPurchaseStatusMsg(res.message || "Selamat datang di Atelier Pro.");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        triggerHaptic("medium");
        if (res.message && res.message !== "Pembelian dibatalkan.") {
          setPurchaseStatusMsg(res.message);
        }
      }
    } catch {
      triggerHaptic("heavy");
      setPurchaseStatusMsg("Terjadi kendala saat memproses pembelian.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsProcessing(true);
    setPurchaseStatusMsg(null);
    triggerHaptic("medium");

    try {
      const res = await restoreAtelierPurchases();
      if (res.isPro) {
        triggerSuccessHaptic();
        setPurchaseStatusMsg(res.message || "Pembelian berhasil dipulihkan.");
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        triggerHaptic("light");
        setPurchaseStatusMsg(res.message || "Tidak ada transaksi aktif.");
      }
    } catch {
      triggerHaptic("heavy");
      setPurchaseStatusMsg("Gagal memeriksa riwayat pembelian.");
    } finally {
      setIsProcessing(false);
    }
  };

  const featureDescriptions: Record<ProFeature, { title: string; desc: string }> = {
    notes_limit: {
      title: "Volume Telah Genap (100 Halaman)",
      desc: "Volume ini telah mencapai batas 100 lembar catatan. Buka Atelier Pro untuk melanjutkan bab tanpa batas atau menambah volume baru di rak buku Anda.",
    },
    spaces_limit: {
      title: "Rak Buku Telah Penuh (3 Edisi)",
      desc: "Rak buku Anda telah memuat 3 edisi volume. Upgrade ke Atelier Pro untuk menyusun koleksi buku jurnal tanpa batas.",
    },
    manuscript_export: {
      title: "Ekspor Manuskrip Folio Lengkap",
      desc: "Cetak seluruh bab tulisan Anda ke dalam buku digital PDF resolusi tinggi siap cetak (A4 / A5).",
    },
    luxury_foil: {
      title: "Letterpress Luxury Foil",
      desc: "Hiasi punggung dan sampul buku Anda dengan kilau daun emas (Antique Gold, Rose Gold, Platinum, atau Emerald).",
    },
    video: {
      title: "Cinematic Video Vignettes",
      desc: "Rekam dan abadikan klip kenangan bergerak hingga 30 detik di dalam catatan.",
    },
    audio_import: {
      title: "Impor Audio Eksternal",
      desc: "Impor file audio, wawancara, atau rekaman suara luar hingga 3 menit.",
    },
    unlimited_photos: {
      title: "Galeri Foto Tanpa Batas",
      desc: "Kurasi foto tanpa batas dalam setiap lembar catatan Anda.",
    },
  };

  const activeContext = triggerFeature ? featureDescriptions[triggerFeature] : null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-start justify-center p-3 sm:p-4 pointer-events-none">
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
          className="fixed inset-0 bg-black/50 backdrop-blur-md pointer-events-auto"
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
            shadow-[0_28px_64px_-12px_rgba(0,0,0,0.32),0_8px_24px_-4px_rgba(0,0,0,0.12)]
            text-[var(--text-primary)]
            p-5 sm:p-6
          "
          style={{
            marginTop: "max(calc(env(safe-area-inset-top, 0px) + 14px), 20px)",
            maxHeight: "calc(100dvh - max(calc(env(safe-area-inset-top, 0px) + 14px), 20px) - 20px)",
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
            className="absolute top-4 right-4 w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs z-20"
            title="Close"
          >
            <X className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          {/* Scrollable Container */}
          <div className="overflow-y-auto no-scrollbar flex-1 pr-0.5 space-y-4">
            {/* Header Seal */}
            <div className="text-center pt-1 space-y-1.5">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] shadow-sm mb-1 text-[var(--text-primary)]">
                <Crown className="w-5 h-5 stroke-[1.8] text-amber-500" />
              </div>
              <div className="text-[9.5px] font-mono uppercase tracking-[0.22em] text-[var(--text-tertiary)] font-semibold">
                Atelier Membership
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Atelier Pro
              </h2>
              <p className="font-serif italic text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                {activeContext
                  ? activeContext.desc
                  : "Kapasitas tanpa batas, sinkronisasi cloud real-time, dan kebebasan mengarsipkan catatan seumur hidup."}
              </p>
            </div>

            {/* Contextual Trigger Alert Banner if feature triggered */}
            {activeContext && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block mb-0.5">
                  {activeContext.title}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Pilih paket di bawah untuk membuka akses tanpa batas.
                </span>
              </div>
            )}

            {/* 3-Tier Pricing Plan Cards */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-semibold px-1">
                Pilih Paket Keanggotaan
              </div>

              {PRICING_PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedPlan(plan.id);
                    }}
                    className={`
                      w-full p-3 rounded-2xl text-left transition-all relative cursor-pointer
                      flex items-center justify-between gap-3 border
                      ${
                        isSelected
                          ? "bg-[var(--text-primary)]/8 border-[var(--text-primary)]/60 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                          : "apple-card border-[var(--glass-border)]/40 hover:border-[var(--glass-border)] opacity-85 hover:opacity-100"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Radio Dot */}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--accent-ink)]"
                            : "border-[var(--text-tertiary)]"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
                            {plan.name}
                          </span>
                          {plan.badge && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] font-sans truncate mt-0.5">
                          {plan.subtext}
                        </p>
                      </div>
                    </div>

                    {/* Price Tag */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono text-[var(--text-primary)]">
                        {plan.price}
                      </div>
                      <div className="text-[9px] text-[var(--text-tertiary)] font-mono">
                        {plan.period}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Core Pro Privileges Highlight */}
            <div className="pt-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-semibold px-1 mb-2">
                Hak Istimewa Anggota Pro
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-left">
                {[
                  { icon: BookOpen, text: "Volume & Halaman Tanpa Batas" },
                  { icon: Cloud, text: "Cloud Sync Multi-Device" },
                  { icon: Video, text: "Motion Video Clips 30s" },
                  { icon: Music, text: "Impor Audio Studio 3 Menit" },
                  { icon: ImageIcon, text: "Foto per Catatan Tanpa Batas" },
                  { icon: Printer, text: "Ekspor Manuskrip Cetak PDF" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-xl inner-pseudo-glass border border-[var(--glass-border)]/40 flex items-center gap-2"
                    >
                      <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0 stroke-[2]" />
                      <span className="text-[10px] font-medium text-[var(--text-secondary)] leading-tight">
                        {item.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 mt-auto space-y-2 border-t border-[var(--glass-border)]/40">
            {purchaseStatusMsg && (
              <div className="p-2 rounded-xl text-center text-[10.5px] font-sans font-medium bg-[var(--text-primary)]/5 border border-[var(--glass-border)] text-[var(--text-secondary)]">
                {purchaseStatusMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleUnlockPro}
              disabled={isProcessing}
              className="w-full py-3 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer shadow-[0_4px_14px_rgba(0,0,0,0.14)] disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>
                    {isPro
                      ? "Atelier Pro Pass Active"
                      : selectedPlan === "lifetime"
                      ? "Unlock All-Time Pass · Rp 499.000"
                      : selectedPlan === "annual"
                      ? "Subscribe Annual · Rp 299.000 / thn"
                      : "Subscribe Monthly · Rp 39.000 / bln"}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              disabled={isProcessing}
              className="w-full py-1 text-center text-[11px] font-sans font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Lanjutkan dengan Edisi Standar
            </button>

            {/* Legal Footnote for Store Compliance */}
            <div className="pt-0.5 text-center text-[10px] text-[var(--text-tertiary)] flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRestorePurchases}
                disabled={isProcessing}
                className="hover:text-[var(--text-primary)] underline decoration-[var(--glass-border)] underline-offset-2 transition-colors cursor-pointer"
              >
                Restore Purchases
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setLegalTab("terms");
                  setIsLegalOpen(true);
                }}
                className="hover:text-[var(--text-primary)] underline decoration-[var(--glass-border)] underline-offset-2 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setLegalTab("privacy");
                  setIsLegalOpen(true);
                }}
                className="hover:text-[var(--text-primary)] underline decoration-[var(--glass-border)] underline-offset-2 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
            </div>
          </div>

          {/* In-App Legal Modal */}
          <LegalModal
            isOpen={isLegalOpen}
            onClose={() => setIsLegalOpen(false)}
            initialTab={legalTab}
          />
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
