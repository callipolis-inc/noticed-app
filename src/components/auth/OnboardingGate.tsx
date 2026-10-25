import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { useAppLanguage } from "@/lib/i18n";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithApple,
  signInWithGoogle,
  sendPasswordResetEmail,
} from "@/lib/supabase";
import { LegalModal, LegalTab } from "@/components/ui/LegalModal";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Globe,
  ChevronDown,
  Check,
  X,
  Compass,
} from "lucide-react";

interface OnboardingGateProps {
  onAuthSuccess: (email: string, userId?: string) => void;
  onContinueAsGuest: () => void;
}

type AuthMode = "signin" | "signup" | "forgot";

// ============================================================================
// STYLE 1: The Curated Manuscript (Floating Layered Notes with Poetic Observation)
// ============================================================================
function ManuscriptCardsHero({ lang }: { lang: "id" | "en" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-72 h-48 sm:h-52 mb-4 flex items-center justify-center select-none"
    >
      {/* Ambient warm radial glow */}
      <div className="absolute inset-0 bg-radial from-amber-500/12 via-amber-700/5 to-transparent blur-2xl pointer-events-none" />

      {/* Floating Floor Shadow */}
      <div className="absolute -bottom-2 w-56 h-4 rounded-[100%] bg-black/60 blur-[8px] pointer-events-none" />

      {/* BACK CARD (Card 3): Forest Sage / Botanical Deckle Card */}
      <motion.div
        animate={{ y: [0, -4, 0], rotate: [9, 10, 9] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-52 h-34 rounded-2xl p-4 shadow-[0_16px_32px_rgba(0,0,0,0.5)] border border-white/10 z-10 flex flex-col justify-between origin-bottom-right"
        style={{
          background: "linear-gradient(145deg, #18261e 0%, #0d1712 100%)",
          transform: "translate(22px, -8px) rotate(9deg)",
        }}
      >
        <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-[#a3c4b0]/70 uppercase">
          <span>FOLIO · 03</span>
          <span className="text-amber-400/80">✦</span>
        </div>
        <div className="space-y-1.5 opacity-40">
          <div className="h-1.5 w-3/4 rounded-full bg-white/30" />
          <div className="h-1.5 w-1/2 rounded-full bg-white/20" />
        </div>
      </motion.div>

      {/* MIDDLE CARD (Card 2): Tuscan Espresso Buckram Card */}
      <motion.div
        animate={{ y: [0, -3, 0], rotate: [-8, -7, -8] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        className="absolute w-52 h-34 rounded-2xl p-4 shadow-[0_18px_36px_rgba(0,0,0,0.55)] border border-white/12 z-20 flex flex-col justify-between origin-bottom-left"
        style={{
          background: "linear-gradient(145deg, #2d1b16 0%, #170d0a 100%)",
          transform: "translate(-22px, -4px) rotate(-8deg)",
        }}
      >
        <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-[#e6ca85]/75 uppercase">
          <span>ARCHIVE · II</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#e6ca85]" />
        </div>
        <div className="flex items-center justify-center py-1">
          <span className="font-serif text-[11px] tracking-wider text-[#e6ca85]/80 italic">
            Noticed Atelier
          </span>
        </div>
        <div className="h-1 w-12 rounded-full bg-[#e6ca85]/30 mx-auto" />
      </motion.div>

      {/* FRONT CARD (Card 1): Tactile Ivory Deckled Paper Note with Poetic Prose */}
      <motion.div
        animate={{ y: [0, -5, 0], rotate: [1.5, 0.5, 1.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="relative w-60 h-38 rounded-2xl p-4 shadow-[0_24px_48px_-10px_rgba(0,0,0,0.65)] border border-white/20 z-30 flex flex-col justify-between text-left overflow-hidden"
        style={{
          background: "linear-gradient(165deg, rgba(255,255,255,0.96) 0%, rgba(246,242,233,0.94) 100%)",
          color: "#1c1b18",
        }}
      >
        {/* Subtle bookmark ribbon corner peeking out */}
        <div className="absolute -top-1 right-6 w-3 h-8 bg-gradient-to-b from-[#d4af37] to-[#b38e28] rounded-b-xs shadow-xs pointer-events-none" />

        {/* Note Header */}
        <div className="flex items-center justify-between border-b border-black/8 pb-1.5">
          <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-stone-500 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>{lang === "id" ? "25 OKT · 07:14" : "OCT 25 · 07:14 AM"}</span>
          </div>
          <span className="text-[10px] text-amber-700/80 font-serif font-semibold">№ 01</span>
        </div>

        {/* Note Handwritten / Serif Body */}
        <p className="font-serif italic text-xs text-stone-800 leading-relaxed pt-0.5">
          {lang === "id"
            ? "“Kabut pagi menyelimuti dahan pinus. Kopi telah mendingin, namun heningnya tetap abadi.”"
            : "“Morning mist settling gently over the pine branches. The tea has cooled, but the quiet remains.”"}
        </p>

        {/* Note Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[9px] font-sans text-stone-400">
          <span>Marginalia</span>
          <span className="font-serif italic text-stone-600">Vol. I</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// STYLE 2: The Spatial Atelier (3D Perspective Open Journal & Liquid Glass)
// ============================================================================
function SpatialOpenJournalHero({ lang: _lang }: { lang: "id" | "en" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-72 h-48 sm:h-52 mb-4 flex items-center justify-center select-none"
      style={{ perspective: "1100px" }}
    >
      {/* Ambient Candlelight Core */}
      <div className="absolute inset-0 bg-radial from-amber-500/15 via-amber-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* 3D Journal Container */}
      <motion.div
        animate={{
          rotateX: [18, 15, 18],
          rotateY: [-6, -3, -6],
          y: [0, -4, 0],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-64 h-36 rounded-xl shadow-[0_28px_56px_-12px_rgba(0,0,0,0.7)] flex items-center justify-center p-1.5"
        style={{
          transformStyle: "preserve-3d",
          background: "linear-gradient(145deg, #2b1a15 0%, #140c09 100%)",
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="absolute inset-x-2 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-200/60 to-transparent pointer-events-none" />

        {/* The Open Journal Spread */}
        <div className="w-full h-full rounded-lg flex overflow-hidden shadow-inner bg-[#1e222a] border border-white/10 relative">
          {/* Left Page (Vellum Parchment Spread) */}
          <div
            className="flex-1 p-3 flex flex-col justify-between text-left relative border-r border-black/30"
            style={{
              background: "linear-gradient(90deg, #1a1e26 0%, #202630 100%)",
            }}
          >
            <div className="text-[9px] font-mono tracking-widest text-amber-400/80 uppercase">
              NOTICED · LIBRA
            </div>
            <div className="space-y-1.5 my-auto">
              <div className="h-1 w-full rounded-full bg-white/15" />
              <div className="h-1 w-4/5 rounded-full bg-white/15" />
              <div className="h-1 w-3/5 rounded-full bg-white/15" />
            </div>
            <div className="text-[8px] font-serif italic text-stone-400">
              Folio XXIV
            </div>
          </div>

          {/* Spine Valley Shadow */}
          <div className="w-2.5 bg-gradient-to-r from-black/60 via-black/80 to-black/60 z-20 relative flex items-center justify-center">
            {/* Silk Ribbon Bookmark cascading across seam */}
            <div className="w-[3px] h-24 bg-gradient-to-b from-[#e6ca85] via-[#d4af37] to-[#a37f20] rounded-full shadow-md transform -translate-y-1 rotate-[6deg]" />
          </div>

          {/* Right Page (Vellum Parchment Spread) */}
          <div
            className="flex-1 p-3 flex flex-col justify-between text-left relative"
            style={{
              background: "linear-gradient(90deg, #202630 0%, #1a1e26 100%)",
            }}
          >
            <div className="flex items-center justify-between text-[9px] font-mono text-stone-400">
              <span>MCXXVI</span>
              <span className="text-amber-400 text-xs">✦</span>
            </div>
            <div className="space-y-1.5 my-auto">
              <div className="h-1 w-full rounded-full bg-white/15" />
              <div className="h-1 w-5/6 rounded-full bg-white/15" />
              <div className="h-1 w-2/3 rounded-full bg-white/10" />
            </div>
            <div className="text-[8px] font-mono text-right text-stone-400">
              p. 01
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Sparkles Dust */}
      <div className="absolute top-4 left-6 w-1.5 h-1.5 rounded-full bg-amber-400/60 blur-[1px] animate-pulse" />
      <div
        className="absolute bottom-6 right-8 w-2 h-2 rounded-full bg-amber-300/40 blur-[1px] animate-pulse"
        style={{ animationDelay: "1.2s" }}
      />
    </motion.div>
  );
}

// ============================================================================
// STYLE 3: The Kyoto Zen Folio (Swiss Typographic Boldness & Ex Libris Stamp)
// ============================================================================
function ZenExLibrisHero({ lang }: { lang: "id" | "en" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-72 h-48 sm:h-52 mb-4 flex items-center justify-center select-none"
    >
      {/* Background Monumental Serif Letterform */}
      <span className="absolute inset-0 flex items-center justify-center font-serif text-[150px] font-bold text-white/[0.04] pointer-events-none select-none -translate-y-2">
        I
      </span>

      {/* Soft Ambient Radial */}
      <div className="absolute inset-0 bg-radial from-amber-500/8 via-transparent to-transparent blur-2xl pointer-events-none" />

      {/* Ex Libris Pass Card */}
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-64 rounded-2xl p-4.5 dynamic-island-shell border border-[var(--glass-border)] shadow-[0_20px_44px_rgba(0,0,0,0.5)] z-10 space-y-3 backdrop-blur-2xl text-left"
      >
        <div className="dynamic-island-specular-rim" />

        {/* Card Header with Artisan Vermilion Stamp */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="text-[9px] font-mono tracking-[0.24em] text-amber-400/90 uppercase font-semibold">
              ATELIER PRIVÉ
            </div>
            <div className="text-[10px] font-serif text-[var(--text-tertiary)] italic">
              Ex Libris Marginalia
            </div>
          </div>

          {/* Artisan Vermilion Seal Stamp */}
          <div className="w-8 h-8 rounded-lg bg-rose-600/90 border border-rose-400/40 shadow-sm flex items-center justify-center text-white font-serif font-bold text-xs select-none transform rotate-3">
            <span>見</span>
          </div>
        </div>

        {/* Minimal Typewriter Thought */}
        <div className="pt-0.5 pb-0.5">
          <p className="font-serif text-xs text-[var(--text-primary)] leading-relaxed italic">
            {lang === "id"
              ? "“Menyadari adalah cara kita mendiami waktu dengan sepenuhnya.”"
              : "“To notice is to inhabit the passing of time with quiet grace.”"}
            <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-1.5 align-middle animate-pulse" />
          </p>
        </div>

        {/* Card Hairline Metadata Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]/50 text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest">
          <span>№ 00892 / ARCHIVE</span>
          <span>TOKYO · 2026</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function OnboardingGate({
  onAuthSuccess,
  onContinueAsGuest,
}: OnboardingGateProps) {
  const [currentLang, setLanguage] = useAppLanguage();
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);

  type PreviewStyle = 1 | 2 | 3;
  const [activeStyle, setActiveStyle] = useState<PreviewStyle>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("style");
      if (p === "1" || p === "2" || p === "3") {
        return parseInt(p, 10) as PreviewStyle;
      }
      const saved = localStorage.getItem("noticed_onboarding_style");
      if (saved === "1" || saved === "2" || saved === "3") {
        return parseInt(saved, 10) as PreviewStyle;
      }
    }
    return 1;
  });

  const handleSelectStyle = (s: PreviewStyle) => {
    triggerHaptic("light");
    setActiveStyle(s);
    if (typeof window !== "undefined") {
      localStorage.setItem("noticed_onboarding_style", s.toString());
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!isLanguageDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("touchstart", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isLanguageDropdownOpen]);

  // Close drawer or dropdown when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (legalModalTab) setLegalModalTab(null);
        else if (isLanguageDropdownOpen) setIsLanguageDropdownOpen(false);
        else if (isAuthDrawerOpen) setIsAuthDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthDrawerOpen, isLanguageDropdownOpen, legalModalTab]);

  const openAuthWithMode = (mode: AuthMode) => {
    triggerHaptic("medium");
    setAuthMode(mode);
    setErrorMessage(null);
    setInfoMessage(null);
    setIsAuthDrawerOpen(true);
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      triggerHaptic("heavy");
      setErrorMessage(
        currentLang === "id"
          ? "Silakan masukkan alamat email yang valid."
          : "Please enter a valid email address.",
      );
      return;
    }

    if (authMode === "forgot") {
      setIsLoading(true);
      setErrorMessage(null);
      setInfoMessage(null);
      try {
        await sendPasswordResetEmail(cleanEmail);
        triggerSuccessHaptic();
        setInfoMessage(
          currentLang === "id"
            ? "Tautan pemulihan kata sandi telah dikirim ke email Anda."
            : "Password reset link has been dispatched to your email inbox.",
        );
      } catch (err: any) {
        triggerHaptic("heavy");
        setErrorMessage(
          err?.message ||
            (currentLang === "id"
              ? "Gagal mengirim email pemulihan kata sandi."
              : "Failed to dispatch password reset email."),
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      triggerHaptic("heavy");
      setErrorMessage(
        currentLang === "id"
          ? "Kata sandi minimal harus 6 karakter."
          : "Password must be at least 6 characters.",
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      if (authMode === "signup") {
        const data = await signUpWithPassword(cleanEmail, password);
        triggerSuccessHaptic();
        if (data?.session?.user) {
          onAuthSuccess(cleanEmail, data.session.user.id);
        } else {
          setInfoMessage(
            currentLang === "id"
              ? "Akun berhasil dibuat! Silakan periksa email Anda untuk konfirmasi."
              : "Account created! Please verify your email to continue.",
          );
        }
      } else {
        const data = await signInWithPassword(cleanEmail, password);
        triggerSuccessHaptic();
        if (data?.user) {
          onAuthSuccess(cleanEmail, data.user.id);
        }
      }
    } catch (err: any) {
      triggerHaptic("heavy");
      console.warn("[OnboardingGate] Auth error:", err);
      setErrorMessage(
        err?.message?.includes("Invalid login credentials")
          ? (currentLang === "id"
              ? "Email atau kata sandi tidak cocok."
              : "Invalid email or password.")
          : err?.message ||
            (currentLang === "id"
              ? "Terjadi kendala saat menghubungkan akun."
              : "An issue occurred while authenticating."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthApple = async () => {
    triggerHaptic("medium");
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithApple();
    } catch (err: any) {
      triggerHaptic("heavy");
      console.warn("[OnboardingGate] Apple sign-in error:", err);
      setErrorMessage(
        err?.message ||
          (currentLang === "id"
            ? "Gagal masuk dengan Apple. Silakan gunakan email."
            : "Sign in with Apple failed. Please use email."),
      );
      setIsLoading(false);
    }
  };

  const handleOAuthGoogle = async () => {
    triggerHaptic("medium");
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      triggerHaptic("heavy");
      console.warn("[OnboardingGate] Google sign-in error:", err);
      setErrorMessage(
        err?.message ||
          (currentLang === "id"
            ? "Gagal masuk dengan Google. Silakan gunakan email."
            : "Sign in with Google failed. Please use email."),
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] select-none">
      {/* Ambient Radial Glass Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[var(--accent-ink)]/10 blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[var(--text-primary)]/5 blur-[90px] pointer-events-none" />

      {/* TOP BAR: Logo branding & Floating Language Pill */}
      <header
        className="w-full flex items-center justify-between px-6 z-20"
        style={{
          paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
        }}
      >
        <div className="flex items-center gap-2 select-none">
          <img
            src="/logo-dark.png"
            alt="Noticed"
            className="w-7 h-7 object-contain drop-shadow-sm select-none"
            onError={(e) => {
              // Fallback icon if logo image fails
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <span className="font-serif text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Noticed
          </span>
        </div>

        {/* Language Switcher Dropdown */}
        <div ref={languageDropdownRef} className="relative z-30">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsLanguageDropdownOpen((prev) => !prev);
            }}
            className="h-8 px-3 rounded-full inner-pseudo-glass border border-[var(--glass-border)]/60 text-xs font-sans font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            aria-expanded={isLanguageDropdownOpen}
          >
            <Globe className="w-3.5 h-3.5 stroke-[1.8]" />
            <span>{currentLang === "id" ? "Bahasa" : "English"}</span>
            <ChevronDown
              className={`w-3 h-3 text-[var(--text-tertiary)] transition-transform duration-200 ${
                isLanguageDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Floating Dropdown Menu */}
          <AnimatePresence>
            {isLanguageDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-2 w-44 rounded-2xl dynamic-island-shell border border-[var(--glass-border)] shadow-[0_16px_36px_rgba(0,0,0,0.45)] p-1.5 z-50 backdrop-blur-2xl"
              >
                <div className="dynamic-island-specular-rim" />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setLanguage("en");
                    setIsLanguageDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    currentLang === "en"
                      ? "bg-white/10 text-[var(--text-primary)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🇬🇧</span>
                    <span>English</span>
                  </span>
                  {currentLang === "en" && (
                    <Check className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setLanguage("id");
                    setIsLanguageDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    currentLang === "id"
                      ? "bg-white/10 text-[var(--text-primary)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🇮🇩</span>
                    <span>Bahasa Indonesia</span>
                  </span>
                  {currentLang === "id" && (
                    <Check className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* STYLE PREVIEW SEGMENTED CONTROL (Live Switcher for User) */}
      <div className="w-full max-w-xs mx-auto px-4 pt-1 pb-1 flex items-center justify-center z-20">
        <div className="flex items-center p-1 rounded-full dynamic-island-shell border border-[var(--glass-border)] shadow-md backdrop-blur-xl gap-1">
          <button
            type="button"
            onClick={() => handleSelectStyle(1)}
            className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all cursor-pointer ${
              activeStyle === 1
                ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs scale-[1.02]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            1 · Manuscript
          </button>
          <button
            type="button"
            onClick={() => handleSelectStyle(2)}
            className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all cursor-pointer ${
              activeStyle === 2
                ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs scale-[1.02]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            2 · Spatial
          </button>
          <button
            type="button"
            onClick={() => handleSelectStyle(3)}
            className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all cursor-pointer ${
              activeStyle === 3
                ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs scale-[1.02]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            3 · Zen
          </button>
        </div>
      </div>

      {/* CENTER HERO: Dynamic 3 Styles with AnimatePresence */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-2 text-center z-10 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeStyle === 1 && (
            <motion.div
              key="hero-style-1"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.3 }}
            >
              <ManuscriptCardsHero lang={currentLang} />
            </motion.div>
          )}

          {activeStyle === 2 && (
            <motion.div
              key="hero-style-2"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.3 }}
            >
              <SpatialOpenJournalHero lang={currentLang} />
            </motion.div>
          )}

          {activeStyle === 3 && (
            <motion.div
              key="hero-style-3"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.3 }}
            >
              <ZenExLibrisHero lang={currentLang} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Headline & Subtitle tailored to each style */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`headline-${activeStyle}-${currentLang}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-2.5 max-w-sm mx-auto"
          >
            {activeStyle === 1 ? (
              <>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.18]">
                  {currentLang === "id"
                    ? "Abadikan keheningan catatan keseharian."
                    : "Notice the quiet beauty of everyday thoughts."}
                </h1>
                <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                  {currentLang === "id"
                    ? "Atelier digital untuk membaca mendalam, menulis hening, dan refleksi jurnal personal."
                    : "The Digital Atelier for Deep Reading, Focused Writing & Quiet Reflection."}
                </p>
              </>
            ) : activeStyle === 2 ? (
              <>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.18]">
                  {currentLang === "id"
                    ? "Ruang suaka bagi pikiran yang bermakna."
                    : "A sanctuary for thoughts that deserve to stay."}
                </h1>
                <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                  {currentLang === "id"
                    ? "Jilid catatan abadi yang disinkronkan secara mulus di seluruh atelier Anda."
                    : "Archival volumes bound with care, synchronized seamlessly across your devices."}
                </p>
              </>
            ) : (
              <>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.18]">
                  {currentLang === "id"
                    ? "Observasi hening & marginalia harian."
                    : "Quiet observations & daily marginalia."}
                </h1>
                <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                  {currentLang === "id"
                    ? "Fokus mendalam. Refleksi intim. Tanpa distraksi."
                    : "Deep focus. Intimate reflection. Minimal distraction."}
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOTTOM ACTION BUTTONS (Matching Reference Mockup) */}
      <footer
        className="w-full px-6 pb-6 z-20 max-w-md mx-auto flex flex-col items-center space-y-3"
        style={{
          paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
        }}
      >
        {/* Primary Action Button: Get Started */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => openAuthWithMode("signup")}
          className="w-full h-12 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.18)] cursor-pointer"
        >
          <span>{currentLang === "id" ? "Mulai Menulis" : "Get Started"}</span>
          <ArrowRight className="w-4 h-4 stroke-[2]" />
        </motion.button>

        {/* Secondary Action Button: I already have an account */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => openAuthWithMode("signin")}
          className="w-full h-12 rounded-full inner-pseudo-glass border border-[var(--glass-border)] text-[var(--text-primary)] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[var(--text-primary)]/5 cursor-pointer shadow-xs"
        >
          <span>
            {currentLang === "id"
              ? "Saya Sudah Memiliki Akun"
              : "I already have an account"}
          </span>
        </motion.button>

        {/* Tertiary Subtle Action: Explore as Guest */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onContinueAsGuest();
          }}
          className="text-xs font-sans font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] pt-1 transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>
            {currentLang === "id"
              ? "Eksplorasi Mode Tamu (Offline)"
              : "Explore as Guest (Offline Mode)"}
          </span>
        </button>

        {/* Legal Disclaimer Footer (Apple App Store Guideline 3.1.2 / 5.1.1) */}
        <div className="pt-2 text-center text-[10.5px] font-sans text-[var(--text-tertiary)] leading-normal max-w-xs">
          <span>
            {currentLang === "id"
              ? "Dengan melanjutkan, Anda menyetujui "
              : "By continuing you agree to our "}
          </span>
          <button
            type="button"
            onClick={() => setLegalModalTab("terms")}
            className="underline underline-offset-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            {currentLang === "id" ? "Syarat Layanan" : "Terms of Service"}
          </button>
          <span>{currentLang === "id" ? " dan " : " and "}</span>
          <button
            type="button"
            onClick={() => setLegalModalTab("privacy")}
            className="underline underline-offset-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            {currentLang === "id" ? "Kebijakan Privasi" : "Privacy Policy"}
          </button>
          <span>.</span>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* AUTHENTICATION DRAWER (LIQUID GLASS BOTTOM SHEET)                     */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isAuthDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
            {/* Backdrop Dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-auto"
              onClick={() => {
                triggerHaptic("light");
                setIsAuthDrawerOpen(false);
              }}
            />

            {/* Drawer Card */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden bg-[var(--sheet-bg)] backdrop-blur-[40px] saturate-[190%] border border-[var(--glass-border)] shadow-[0_28px_64px_-12px_rgba(0,0,0,0.35)] p-6 z-10 text-[var(--text-primary)]"
              style={{
                paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 20px), 24px)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Indicator on Mobile */}
              <div className="w-10 h-1 rounded-full bg-[var(--text-tertiary)]/30 mx-auto mb-4 sm:hidden" />

              {/* Header with Close */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]/40 mb-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                    {authMode === "signup"
                      ? currentLang === "id"
                        ? "Buat Akun Atelier"
                        : "Join the Atelier"
                      : authMode === "signin"
                        ? currentLang === "id"
                          ? "Selamat Datang Kembali"
                          : "Welcome Back"
                        : currentLang === "id"
                          ? "Pemulihan Kata Sandi"
                          : "Reset Password"}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
                    {authMode === "signup"
                      ? currentLang === "id"
                        ? "Sinkronkan catatan & kolaborasi ruang kerja di semua gawai."
                        : "Sync notes and spaces across your Apple and Android devices."
                      : authMode === "signin"
                        ? currentLang === "id"
                          ? "Masuk untuk mengakses perpustakaan dan catatan Anda."
                          : "Sign in to access your synchronized library."
                        : currentLang === "id"
                          ? "Masukkan email Anda untuk menerima tautan pemulihan."
                          : "Enter your registered email to receive a recovery link."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAuthDrawerOpen(false)}
                  className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status & Error Alerts */}
              {errorMessage && (
                <div className="mb-3.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans flex items-start gap-2">
                  <span>{errorMessage}</span>
                </div>
              )}
              {infoMessage && (
                <div className="mb-3.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* OAUTH SECTION (Only shown in signin and signup modes) */}
              {authMode !== "forgot" && (
                <div className="space-y-2.5 mb-4">
                  {/* Sign in with Apple Button (Apple HIG Compliant) */}
                  <button
                    type="button"
                    onClick={handleOAuthApple}
                    disabled={isLoading}
                    className="w-full h-11 rounded-full bg-black text-white dark:bg-white dark:text-black font-sans text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer shadow-xs border border-white/10 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 fill-current mb-0.5" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.07-7.73-7.91-12.08-14.52-5.77-8.7-10.15-18.49-13.13-29.38-2.98-10.89-4.47-21.2-4.47-30.93 0-14.18 3.55-26.04 10.66-35.58 7.1-9.54 16.03-14.38 26.79-14.52 4.8-.13 10.02 1.25 15.66 4.14 5.64 2.89 9.29 4.38 10.95 4.47 1.45 0 5.23-1.57 11.34-4.71 6.11-3.14 11.63-4.52 16.57-4.14 12.63.85 22.84 5.61 30.63 14.28-11.08 6.74-16.51 16.01-16.3 27.81.2 9.53 3.87 17.56 11 24.08 7.14 6.53 15.68 10.22 25.64 11.07-2.18 6.53-4.8 13.06-7.89 19.59zM119.22 31.84c0-7.39 2.66-14.33 7.97-20.82 5.32-6.5 11.83-10.38 19.53-11.66.13 1.13.2 2.16.2 3.09 0 7.39-2.73 14.4-8.19 21.03-5.46 6.63-12.05 10.45-19.78 11.46-.26-1.07-.39-2.11-.39-3.1z" />
                    </svg>
                    <span>
                      {authMode === "signup"
                        ? currentLang === "id"
                          ? "Daftar dengan Apple"
                          : "Sign up with Apple"
                        : currentLang === "id"
                          ? "Masuk dengan Apple"
                          : "Sign in with Apple"}
                    </span>
                  </button>

                  {/* Sign in with Google Button */}
                  <button
                    type="button"
                    onClick={handleOAuthGoogle}
                    disabled={isLoading}
                    className="w-full h-11 rounded-full inner-pseudo-glass border border-[var(--glass-border)] font-sans text-xs font-semibold flex items-center justify-center gap-2 text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-98 transition-transform cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>
                      {authMode === "signup"
                        ? currentLang === "id"
                          ? "Daftar dengan Google"
                          : "Sign up with Google"
                        : currentLang === "id"
                          ? "Masuk dengan Google"
                          : "Sign in with Google"}
                    </span>
                  </button>

                  <div className="relative flex items-center justify-center pt-2 pb-1">
                    <div className="w-full border-t border-[var(--glass-border)]/40" />
                    <span className="absolute px-2.5 bg-[var(--sheet-bg)] text-[10px] font-sans text-[var(--text-tertiary)] uppercase tracking-wider">
                      {currentLang === "id" ? "atau email" : "or email"}
                    </span>
                  </div>
                </div>
              )}

              {/* EMAIL & PASSWORD FORM */}
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
                {/* Email input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium">
                    {currentLang === "id" ? "Alamat Email" : "Email Address"}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="author@atelier.com"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full h-11 pl-9 pr-3 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Password input (Hidden during forgot password) */}
                {authMode !== "forgot" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium">
                        {currentLang === "id" ? "Kata Sandi" : "Password"}
                      </label>
                      {authMode === "signin" && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setAuthMode("forgot");
                            setErrorMessage(null);
                            setInfoMessage(null);
                          }}
                          className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer"
                        >
                          {currentLang === "id"
                            ? "Lupa kata sandi?"
                            : "Forgot password?"}
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full h-11 pl-9 pr-10 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 w-5 h-5 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer shadow-xs disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {authMode === "signup"
                          ? currentLang === "id"
                            ? "Daftar Akun Baru"
                            : "Create Account"
                          : authMode === "signin"
                            ? currentLang === "id"
                              ? "Masuk ke Noticed"
                              : "Sign In"
                            : currentLang === "id"
                              ? "Kirim Tautan Reset"
                              : "Send Reset Link"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode Toggle Switcher at Bottom */}
              <div className="pt-4 text-center">
                {authMode === "forgot" ? (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setAuthMode("signin");
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>
                      {currentLang === "id"
                        ? "Kembali ke Masuk"
                        : "Back to Sign In"}
                    </span>
                  </button>
                ) : authMode === "signin" ? (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {currentLang === "id"
                      ? "Belum memiliki akun? "
                      : "Don't have an account yet? "}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setAuthMode("signup");
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className="font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      {currentLang === "id" ? "Daftar" : "Sign Up"}
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {currentLang === "id"
                      ? "Sudah memiliki akun? "
                      : "Already have an account? "}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setAuthMode("signin");
                        setErrorMessage(null);
                        setInfoMessage(null);
                      }}
                      className="font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      {currentLang === "id" ? "Masuk" : "Sign In"}
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* LEGAL MODAL (TERMS OF SERVICE / PRIVACY POLICY)                      */}
      {/* ==================================================================== */}
      {legalModalTab && (
        <LegalModal
          isOpen={Boolean(legalModalTab)}
          onClose={() => setLegalModalTab(null)}
          initialTab={legalModalTab}
        />
      )}
    </div>
  );
}
