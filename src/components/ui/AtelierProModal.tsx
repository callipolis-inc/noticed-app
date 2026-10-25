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
  Check,
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
  const [storeOffering, setStoreOffering] = useState<PurchasesOffering | null>(null);
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
          id: "lifetime",
          name: "All-Time Patron",
          price: "Rp 499.000",
          period: "one-time payment",
          subtext: "Subscription-free forever · Yours eternally",
          badge: "Patron Pass",
          isPopular: true,
        },
        {
          id: "annual",
          name: "Annual Folio",
          price: "Rp 299.000",
          period: "/ year",
          subtext: "Equivalent to Rp 24,900 / mo (Save 36%)",
          badge: "Save 36%",
        },
        {
          id: "monthly",
          name: "Monthly Scribe",
          price: "Rp 39.000",
          period: "/ month",
          subtext: "Flexible without long-term commitment",
        },
      ];
    }
    return [
      {
        id: "lifetime",
        name: "All-Time Patron",
        price: "Rp 499.000",
        period: "sekali bayar",
        subtext: "Bebas langganan selamanya · Milik Anda abadi",
        badge: "Patron Pass",
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
        if (plan.id === "monthly") return id.includes("monthly") || type.includes("monthly");
        if (plan.id === "annual") return id.includes("annual") || type.includes("annual");
        if (plan.id === "lifetime") return id.includes("lifetime") || type.includes("lifetime");
        return false;
      });

      if (pkg?.product?.priceString) {
        return {
          ...plan,
          price: pkg.product.priceString,
        };
      }
      return plan;
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
          desc: "This volume has reached the 100-page limit. Unlock Atelier Pro to continue writing without limits or create new volumes on your shelf.",
        },
        spaces_limit: {
          title: "Bookshelf Capacity Reached (3 Volumes)",
          desc: "Your bookshelf currently holds 3 journal editions. Upgrade to Atelier Pro to curate an unlimited library of bespoke notebooks.",
        },
        manuscript_export: {
          title: "Export Complete Folio Manuscript",
          desc: "Publish and print your entire collection into high-resolution, print-ready PDF book formats (A4 / A5).",
        },
        luxury_foil: {
          title: "Letterpress Luxury Foil",
          desc: "Adorn your notebook spines and covers with metallic foil stamping (Antique Gold, Rose Gold, Platinum, or Emerald).",
        },
        video: {
          title: "Cinematic Video Vignettes",
          desc: "Capture and preserve moving memory clips up to 30 seconds within your notices.",
        },
        audio_import: {
          title: "External Studio Audio Import",
          desc: "Import audio files, voice recordings, or soundtrack memos up to 3 minutes.",
        },
        unlimited_photos: {
          title: "Unlimited Photographic Gallery",
          desc: "Embed boundless photographs and polaroids within every marginalia entry.",
        },
      };
    }
    return {
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
            marginTop: "max(calc(env(safe-area-inset-top, 0px) + 20px), 28px)",
            maxHeight:
              "calc(100dvh - max(calc(env(safe-area-inset-top, 0px) + 20px), 28px) - max(env(safe-area-inset-bottom, 0px), 20px))",
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 4px), 16px)",
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
              <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] shadow-sm mb-1 text-[var(--text-primary)]">
                <Sparkles className="w-5 h-5 stroke-[1.25] text-[var(--accent-ink)]" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[var(--text-primary)]/5 to-transparent pointer-events-none" />
              </div>
              <div className="text-[9.5px] font-mono uppercase tracking-[0.22em] text-[var(--text-tertiary)] font-semibold">
                {t.atelierPro.membership}
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {t.atelierPro.title}
              </h2>
              <p className="font-serif italic text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                {activeContext
                  ? activeContext.desc
                  : t.atelierPro.defaultDesc}
              </p>
            </div>

            {/* Contextual Trigger Alert Banner if feature triggered */}
            {activeContext && (
              <div className="p-3 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] text-center space-y-0.5">
                <span className="text-[11px] font-semibold text-[var(--text-primary)] block">
                  {activeContext.title}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {currentLang === "id"
                    ? "Pilih paket di bawah untuk membuka akses tanpa batas."
                    : "Select a membership tier below to unlock unlimited access."}
                </span>
              </div>
            )}

            {/* 3-Tier Pricing Plan Cards */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-tertiary)] font-semibold px-1">
                {t.atelierPro.planSelection}
              </div>

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
                    className={`
                      w-full p-3 rounded-2xl text-left transition-all relative cursor-pointer
                      flex items-center justify-between gap-3 border
                      ${
                        isSelected
                          ? "bg-[var(--text-primary)]/8 border-[var(--text-primary)]/60 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
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
                            : "border-[var(--glass-border)]"
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
                            {plan.name}
                          </span>
                          {plan.badge && (
                            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] border border-[var(--glass-border)]">
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
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-tertiary)] font-semibold px-1 mb-2">
                {t.atelierPro.privilegesTitle}
              </div>

              <div className="grid grid-cols-2 gap-2 text-left">
                {[
                  { icon: BookOpen, text: t.atelierPro.privileges.unlimitedVolumes },
                  { icon: Cloud, text: t.atelierPro.privileges.cloudSync },
                  { icon: Video, text: t.atelierPro.privileges.motionClips },
                  { icon: Music, text: t.atelierPro.privileges.audioStudio },
                  { icon: ImageIcon, text: t.atelierPro.privileges.unlimitedPhotos },
                  { icon: Printer, text: t.atelierPro.privileges.printPdf },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)]/50 flex items-center gap-2.5"
                    >
                      <div className="w-6 h-6 rounded-xl bg-[var(--text-primary)]/5 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-80 stroke-[1.6]" />
                      </div>
                      <span className="text-[10.5px] font-medium text-[var(--text-secondary)] leading-tight">
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

            {/* Apple Guideline 3.1.2 Auto-Renewal Disclosure */}
            <div className="px-1 text-center">
              {selectedPlan === "lifetime" ? (
                <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                  {t.atelierPro.oneTimeNotice}
                </p>
              ) : (
                <p className="text-[9.5px] text-[var(--text-tertiary)] leading-normal">
                  {t.atelierPro.subscriptionDisclosure.replace("{price}", activePlanObj.price).replace("{period}", activePlanObj.period)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleUnlockPro}
              disabled={isProcessing}
              className="w-full py-3 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer shadow-[0_4px_14px_rgba(0,0,0,0.14)] disabled:opacity-60"
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
                      ? "Atelier Pro Pass Active"
                      : selectedPlan === "lifetime"
                        ? `${currentLang === "id" ? "Buka Akses Permanen" : "Unlock All-Time Pass"} · ${activePlanObj.price}`
                        : selectedPlan === "annual"
                          ? `${currentLang === "id" ? "Berlangganan Tahunan" : "Subscribe Annual"} · ${activePlanObj.price} / ${currentLang === "id" ? "thn" : "yr"}`
                          : `${currentLang === "id" ? "Berlangganan Bulanan" : "Subscribe Monthly"} · ${activePlanObj.price} / ${currentLang === "id" ? "bln" : "mo"}`}
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
              {t.atelierPro.continueStandard}
            </button>

            {/* Legal Footnote for Store Compliance (Apple Guideline 3.1.2) */}
            <div className="pt-0.5 text-center text-[10px] text-[var(--text-tertiary)] flex items-center justify-center gap-1.5 flex-wrap">
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
              <span>·</span>
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--text-primary)] underline decoration-[var(--glass-border)] underline-offset-2 transition-colors cursor-pointer"
              >
                Apple Standard EULA
              </a>
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
