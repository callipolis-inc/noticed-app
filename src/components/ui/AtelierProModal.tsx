import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Video,
  Music,
  Image as ImageIcon,
  Cloud,
  X,
  BookOpen,
  Printer,
  RotateCw,
} from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { useProStatus, ProFeature } from "@/lib/proManager";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import {
  purchaseAtelierPlan,
  restoreAtelierPurchases,
  getAtelierOfferings,
} from "@/lib/purchases";
import { PurchasesOffering } from "@revenuecat/purchases-capacitor";
import { LegalModal, LegalTab } from "./LegalModal";
import { useAppLanguage } from "@/lib/i18n";

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
  secondaryPrice?: string;
  period: string;
  subtext: string;
  badge?: string;
  isPopular?: boolean;
}

export function AtelierProModal({
  isOpen,
  onClose,
  triggerFeature,
}: AtelierProModalProps) {
  useLockBodyScroll(isOpen);
  const [currentLang, , t] = useAppLanguage();

  const isPro = useProStatus();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanId>("lifetime");
  const [storeOffering, setStoreOffering] = useState<PurchasesOffering | null>(
    null,
  );
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>("terms");
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseStatusMsg, setPurchaseStatusMsg] = useState<string | null>(
    null,
  );

  const basePlans: PricingPlan[] = useMemo(() => {
    if (currentLang === "en") {
      return [
        {
          id: "monthly",
          name: "Monthly",
          price: "Rp 39.000",
          period: "/ month",
          subtext: "Flexible cadence, cancel anytime",
        },
        {
          id: "annual",
          name: "Annual",
          price: "Rp 299.000",
          period: "/ year",
          subtext: "Equivalent to Rp 24,900 / mo",
          badge: "Save 36%",
        },
        {
          id: "lifetime",
          name: "Patron",
          price: "Rp 499.000",
          period: "one-time",
          subtext: "Subscription-free forever · Yours eternally",
          badge: "Lifetime",
          isPopular: true,
        },
      ];
    }
    return [
      {
        id: "monthly",
        name: "Bulanan",
        price: "Rp 39.000",
        period: "/ bulan",
        subtext: "Fleksibel tanpa komitmen jangka panjang",
      },
      {
        id: "annual",
        name: "Tahunan",
        price: "Rp 299.000",
        period: "/ tahun",
        subtext: "Setara Rp 24.900 / bulan",
        badge: "Hemat 36%",
      },
      {
        id: "lifetime",
        name: "Patron",
        price: "Rp 499.000",
        period: "sekali bayar",
        subtext: "Bebas langganan selamanya · Milik Anda abadi",
        badge: "Permanen",
        isPopular: true,
      },
    ];
  }, [currentLang]);

  useEffect(() => {
    let isMounted = true;
    getAtelierOfferings()
      .then((offering) => {
        if (isMounted && offering?.availablePackages?.length) {
          setStoreOffering(offering);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const localizedPlans = useMemo(() => {
    if (!storeOffering || !storeOffering.availablePackages.length) {
      return basePlans;
    }

    return basePlans.map((plan) => {
      const pkg = storeOffering.availablePackages.find((p) => {
        const id = p.identifier.toLowerCase();
        const type = String(p.packageType || "").toLowerCase();
        if (plan.id === "monthly")
          return id.includes("monthly") || type.includes("monthly");
        if (plan.id === "annual")
          return id.includes("annual") || type.includes("annual");
        if (plan.id === "lifetime")
          return id.includes("lifetime") || type.includes("lifetime");
        return false;
      });

      let priceStr = plan.price;
      let secondaryPrice: string | undefined;

      if (pkg?.product?.priceString) {
        priceStr = pkg.product.priceString;
        const currency = pkg.product.currencyCode?.toUpperCase();
        const isNonIdr = currency && currency !== "IDR";
        const hasDollar = priceStr.includes("$");

        if (isNonIdr || hasDollar) {
          if (plan.id === "monthly") secondaryPrice = "≈ Rp 39.000";
          else if (plan.id === "annual") secondaryPrice = "≈ Rp 299.000";
          else if (plan.id === "lifetime") secondaryPrice = "≈ Rp 499.000";
        }
      }

      return {
        ...plan,
        price: priceStr,
        secondaryPrice,
      };
    });
  }, [storeOffering, basePlans]);

  const featureDescriptions: Record<
    ProFeature,
    { title: string; desc: string }
  > = useMemo(() => {
    if (currentLang === "en") {
      return {
        notes_limit: {
          title: "Volume Capacity Reached (100 Pages)",
          desc: "Unlock Atelier Pro to continue writing without limits or create new volumes on your shelf.",
        },
        spaces_limit: {
          title: "Bookshelf Capacity Reached (3 Volumes)",
          desc: "Upgrade to Atelier Pro to curate an unlimited library of bespoke notebooks.",
        },
        manuscript_export: {
          title: "Export Complete Folio Manuscript",
          desc: "Publish and print your entire collection into high-resolution, print-ready PDF book formats.",
        },
        luxury_foil: {
          title: "Letterpress Luxury Foil",
          desc: "Adorn your notebook spines and covers with metallic foil stamping.",
        },
        video: {
          title: "Cinematic Video Vignettes",
          desc: "Capture and preserve moving memory clips up to 30 seconds within your notes.",
        },
        audio_import: {
          title: "External Studio Audio Import",
          desc: "Import audio recordings or soundtrack memos up to 3 minutes.",
        },
        unlimited_photos: {
          title: "Unlimited Photographic Gallery",
          desc: "Embed boundless photographs and polaroids within every marginalia entry.",
        },
      };
    }
    return {
      notes_limit: {
        title: "Kapasitas Halaman Penuh (100 Lembar)",
        desc: "Buka Atelier Pro untuk melanjutkan bab tanpa batas atau menambah volume baru di rak buku Anda.",
      },
      spaces_limit: {
        title: "Rak Buku Penuh (3 Edisi)",
        desc: "Upgrade ke Atelier Pro untuk menyusun koleksi buku jurnal tanpa batas.",
      },
      manuscript_export: {
        title: "Ekspor Manuskrip Folio Lengkap",
        desc: "Cetak seluruh bab tulisan Anda ke dalam buku PDF resolusi tinggi siap cetak.",
      },
      luxury_foil: {
        title: "Letterpress Luxury Foil",
        desc: "Hiasi punggung dan sampul buku Anda dengan kilau daun emas premium.",
      },
      video: {
        title: "Cinematic Video Vignettes",
        desc: "Rekam dan abadikan klip kenangan bergerak hingga 30 detik di dalam catatan.",
      },
      audio_import: {
        title: "Impor Audio Eksternal",
        desc: "Impor file audio atau rekaman suara luar berkualitas hingga 3 menit.",
      },
      unlimited_photos: {
        title: "Galeri Foto Tanpa Batas",
        desc: "Kurasi foto tanpa batas dalam setiap lembar catatan Anda.",
      },
    };
  }, [currentLang]);

  const activePlanObj =
    localizedPlans.find((p) => p.id === selectedPlan) || localizedPlans[0];

  const activeContext = triggerFeature
    ? featureDescriptions[triggerFeature]
    : null;

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

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-3.5 sm:p-4 pointer-events-none">
        {/* Adaptive Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="fixed inset-0 bg-black/35 backdrop-blur-xl pointer-events-auto"
        />

        {/* Liquid Glass Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="
            pointer-events-auto relative w-full max-w-[380px]
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

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
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

          {/* Header */}
          <div className="text-center pt-0.5 space-y-1">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[var(--text-primary)]/[0.06] border border-[var(--glass-border)] shadow-xs mb-0.5">
              <Sparkles className="w-4 h-4 text-[var(--text-primary)] stroke-[1.8]" />
            </div>
            <div className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--text-tertiary)] font-semibold">
              {t.atelierPro.membership}
            </div>
            <h2 className="font-serif text-[23px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              {t.atelierPro.title}
            </h2>
          </div>

          {/* Context Alert (jika limit tercapai) */}
          {activeContext && (
            <div className="px-3 py-2 rounded-2xl bg-[var(--text-primary)]/[0.04] border border-[var(--glass-border)] text-center space-y-0.5">
              <span className="text-[11px] font-semibold text-[var(--text-primary)] block">
                {activeContext.title}
              </span>
              <p className="text-[10px] text-[var(--text-secondary)] leading-snug">
                {activeContext.desc}
              </p>
            </div>
          )}

          {/* Apple Segmented Pill Dock */}
          <div className="p-1 rounded-full bg-[var(--text-primary)]/[0.05] border border-[var(--glass-border)]/80 flex items-center justify-between gap-1 shadow-inner">
            {localizedPlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedPlan(plan.id);
                  }}
                  className="relative flex-1 py-1.5 px-2 rounded-full text-center transition-all cursor-pointer z-10 select-none"
                >
                  {isSelected && (
                    <motion.div
                      layoutId="liquidGlaze"
                      transition={{
                        type: "spring",
                        stiffness: 480,
                        damping: 36,
                      }}
                      className="absolute inset-0 rounded-full bg-[var(--sheet-bg)] border border-[var(--glass-border)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    />
                  )}
                  <span
                    className={`relative text-[11px] tracking-tight block transition-colors ${
                      isSelected
                        ? "text-[var(--text-primary)] font-semibold"
                        : "text-[var(--text-tertiary)] font-medium hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {plan.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Adaptive Spotlight Card */}
          <div className="rounded-[22px] py-3 px-4 bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)] shadow-xs text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] tracking-tight">
                {activePlanObj.name}
              </span>
              {activePlanObj.badge && (
                <span className="text-[8.5px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] border border-[var(--glass-border)]">
                  {activePlanObj.badge}
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-center gap-1.5 pt-0.5">
              <span className="text-[24px] font-bold font-mono tracking-tight text-[var(--text-primary)] leading-none">
                {activePlanObj.price}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] font-sans">
                {activePlanObj.period}
              </span>
            </div>

            {activePlanObj.secondaryPrice && (
              <div className="text-[9px] font-mono text-[var(--text-tertiary)] tabular-nums">
                {activePlanObj.secondaryPrice}
              </div>
            )}

            <p className="text-[10px] text-[var(--text-secondary)] font-sans leading-tight opacity-90 max-w-[270px] mx-auto pt-0.5">
              {activePlanObj.subtext}
            </p>
          </div>

          {/* Clean 2-Column Feature List (Tanpa elipsis, teks bernapas rapi) */}
          <div className="rounded-[20px] p-3 bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)]/60">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {[
                {
                  icon: BookOpen,
                  text: t.atelierPro.privileges.unlimitedVolumes,
                },
                { icon: Cloud, text: t.atelierPro.privileges.cloudSync },
                { icon: Video, text: t.atelierPro.privileges.motionClips },
                { icon: Music, text: t.atelierPro.privileges.audioStudio },
                {
                  icon: ImageIcon,
                  text: t.atelierPro.privileges.unlimitedPhotos,
                },
                { icon: Printer, text: t.atelierPro.privileges.printPdf },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-2 min-w-0">
                    <div className="w-4 h-4 rounded-full bg-[var(--text-primary)]/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-2.5 h-2.5 text-[var(--text-primary)] stroke-[2]" />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--text-secondary)] leading-tight break-words">
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button & Status */}
          <div className="space-y-1.5 pt-0.5">
            {purchaseStatusMsg && (
              <div className="py-1 px-2.5 rounded-xl text-center text-[10px] font-sans font-medium bg-[var(--text-primary)]/5 border border-[var(--glass-border)] text-[var(--text-secondary)]">
                {purchaseStatusMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleUnlockPro}
              disabled={isProcessing}
              className="
                w-full h-11 px-4 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)]
                text-[12.5px] font-semibold tracking-wide flex items-center justify-center gap-2
                shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50
              "
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.atelierPro.processing}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>
                    {isPro
                      ? "Atelier Pro Active"
                      : selectedPlan === "lifetime"
                        ? `${currentLang === "id" ? "Buka Akses Permanen" : "Unlock All-Time Pass"} · ${activePlanObj.price}`
                        : `${currentLang === "id" ? "Berlangganan" : "Subscribe"} ${activePlanObj.name} · ${activePlanObj.price}`}
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
              className="w-full text-center text-[11px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-0.5"
            >
              {t.atelierPro.continueStandard}
            </button>
          </div>

          {/* Minimal Legal & Store Compliance */}
          <div className="pt-1 border-t border-[var(--glass-border)]/50 space-y-1.5 text-center">
            <p className="text-[9px] text-[var(--text-tertiary)]/80 leading-tight px-1">
              {selectedPlan === "lifetime"
                ? t.atelierPro.oneTimeNotice
                : t.atelierPro.subscriptionDisclosure
                    .replace("{price}", activePlanObj.price)
                    .replace("{period}", activePlanObj.period)}
            </p>

            <div className="text-[9px] text-[var(--text-tertiary)] flex items-center justify-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleRestorePurchases}
                disabled={isProcessing}
                className="hover:text-[var(--text-primary)] underline decoration-[var(--glass-border)] underline-offset-2 transition-colors cursor-pointer"
              >
                Restore
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
                Terms
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
                Privacy
              </button>
              <span>·</span>
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--text-primary)] underline decoration-[var(--glass-border)] underline-offset-2 transition-colors cursor-pointer"
              >
                EULA
              </a>
            </div>

            <div className="text-[8.5px] text-[var(--text-tertiary)]/65 leading-tight">
              {currentLang === "id"
                ? "Pembayaran Apple IAP · GoPay, DANA, ShopeePay & Kartu Debit."
                : "Official Apple IAP · Supports GoPay, DANA, ShopeePay & Debit Cards."}
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
