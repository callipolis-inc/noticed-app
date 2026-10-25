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
// SLIDE 0: The Fountain Pen & Flowing Gold Ink Line (Mindful Writing / Expression)
// ============================================================================
function FountainPenHero() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45 }}
      className="relative w-72 h-44 sm:h-48 mb-3 flex items-center justify-center select-none"
    >
      {/* Ambient warm radial glow */}
      <div className="absolute inset-0 bg-radial from-amber-500/12 via-amber-700/5 to-transparent blur-2xl pointer-events-none" />

      {/* Floor Contact Shadow */}
      <div className="absolute -bottom-1 w-52 h-3.5 rounded-[100%] bg-black/60 blur-[6px] pointer-events-none" />

      {/* SVG Fluid Ink Stream */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 288 192"
        fill="none"
      >
        <defs>
          <linearGradient id="goldInkFlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3de98" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#d4af37" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#967722" stopOpacity="0.2" />
          </linearGradient>
          <filter id="inkGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient fluid handwritten wave */}
        <motion.path
          d="M 30,120 Q 90,60 148,112 T 255,85"
          stroke="url(#goldInkFlow)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#inkGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        <motion.path
          d="M 50,135 Q 110,85 165,125 T 240,105"
          stroke="rgba(212,175,55,0.25)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.2 }}
        />
      </svg>

      {/* Floating Fountain Pen */}
      <motion.div
        animate={{
          y: [0, -6, 0],
          rotate: [-34, -32, -34],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-20 w-44 h-8 flex items-center origin-center translate-y-1 -translate-x-2"
        style={{
          filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.6))",
        }}
      >
        {/* Pen Barrel: Obsidian Enamel with 24k Gold Accents */}
        <div className="w-28 h-4.5 rounded-l-full bg-gradient-to-r from-[#0d0f12] via-[#21262d] to-[#12161b] border-t border-b border-white/20 relative shadow-inner flex items-center justify-end pr-2">
          {/* Specular cylindrical highlight */}
          <div className="absolute inset-x-2 top-0.5 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          {/* Gold Pocket Clip */}
          <div className="absolute -top-1 left-4 w-12 h-1 rounded-full bg-gradient-to-r from-[#e6ca85] to-[#b38e28] shadow-xs" />
          {/* Gold Trim Ring */}
          <div className="w-1.5 h-full bg-gradient-to-b from-[#f3de98] via-[#d4af37] to-[#8f701c] shadow-xs" />
        </div>

        {/* Grip Section */}
        <div className="w-8 h-3.5 bg-gradient-to-r from-[#181a1f] to-[#252830] border-t border-b border-black/60 relative">
          <div className="absolute inset-y-0 right-0 w-[1.5px] bg-[#d4af37]/80" />
        </div>

        {/* 14k Two-Tone Gold Nib */}
        <div className="w-7 h-4 relative flex items-center">
          <svg viewBox="0 0 40 24" className="w-full h-full drop-shadow-xs">
            <defs>
              <linearGradient id="goldNibGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fae8b2" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#967722" />
              </linearGradient>
            </defs>
            {/* Nib Body */}
            <path
              d="M 0,4 L 14,2 C 24,2 32,8 38,12 C 32,16 24,22 14,22 L 0,20 Z"
              fill="url(#goldNibGrad)"
              stroke="#8c6d1d"
              strokeWidth="0.8"
            />
            {/* Center Slit & Breather Hole */}
            <line x1="8" y1="12" x2="38" y2="12" stroke="#2a1f0a" strokeWidth="0.8" />
            <circle cx="16" cy="12" r="1.5" fill="#2a1f0a" />
            {/* Ornate engraving scroll lines */}
            <path
              d="M 6,7 Q 16,8 24,10 M 6,17 Q 16,16 24,14"
              stroke="rgba(42,31,10,0.5)"
              strokeWidth="0.6"
              fill="none"
            />
          </svg>
        </div>
      </motion.div>

      {/* Floating Sparkles Motif */}
      <motion.div
        animate={{
          y: [-4, 4, -4],
          rotate: [0, 8, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-5 right-8 z-20 flex items-center justify-center"
      >
        <span className="text-amber-400/90 text-sm drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
          ✦
        </span>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// SLIDE 1: The 3 Hand-Bound Archival Volumes (Curating / Bookshelf)
// ============================================================================
function ArchivalVolumesHero() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="relative w-72 h-44 sm:h-48 mb-3 flex items-end justify-center select-none"
    >
      {/* Ambient warm radial glow */}
      <div className="absolute inset-0 bg-radial from-amber-500/10 via-amber-700/5 to-transparent blur-2xl pointer-events-none" />

      {/* Bookshelf Floor Contact Shadow */}
      <div className="absolute -bottom-1.5 w-52 h-4 rounded-[100%] bg-black/60 blur-[6px] pointer-events-none" />

      {/* The 3 Books Ensemble */}
      <div className="relative flex items-end pb-1 pl-2">
        {/* BOOK 1: Left - Upright (Midnight Charcoal Archival Buckram Cloth) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="relative w-[34px] h-[138px] rounded-t-[4px] rounded-b-[2px] shadow-[0_12px_24px_rgba(0,0,0,0.45)] flex flex-col justify-between py-3 items-center z-10 overflow-hidden cursor-default"
          style={{
            background: "linear-gradient(180deg, #242933 0%, #171b22 100%)",
            borderLeft: "1px solid rgba(255,255,255,0.14)",
            borderRight: "1px solid rgba(0,0,0,0.65)",
            borderTop: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          {/* Top Foil Band */}
          <div className="w-5 h-[1.5px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent" />

          {/* Vertical Foil Title */}
          <div className="flex flex-col items-center">
            <span
              style={{ writingMode: "vertical-rl" }}
              className="font-serif text-[8.5px] tracking-[0.25em] text-[#d4af37]/85 uppercase rotate-180 select-none font-medium"
            >
              SILENCE · I
            </span>
          </div>

          {/* Bottom Foil Rib */}
          <div className="w-5 h-[1.5px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent" />
        </motion.div>

        {/* BOOK 2: Center - Upright (Tuscan Espresso Leather) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="relative w-[38px] h-[154px] rounded-t-[5px] rounded-b-[2px] shadow-[0_14px_28px_rgba(0,0,0,0.55)] flex flex-col justify-between py-3.5 items-center z-20 overflow-hidden -ml-1 cursor-default"
          style={{
            background: "linear-gradient(180deg, #321c17 0%, #1a0e0b 100%)",
            borderLeft: "1px solid rgba(255,255,255,0.16)",
            borderRight: "1px solid rgba(0,0,0,0.7)",
            borderTop: "1px solid rgba(255,255,255,0.28)",
          }}
        >
          {/* Top Embossed Ribs */}
          <div className="w-full px-2 flex flex-col gap-1 items-center">
            <div className="w-6 h-[1.5px] bg-[#e6ca85]/75 shadow-xs" />
            <div className="w-6 h-[1px] bg-[#e6ca85]/40" />
          </div>

          {/* Center Foil Emblem & Vertical Title */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[9px] text-[#e6ca85] select-none leading-none">✦</span>
            <span
              style={{ writingMode: "vertical-rl" }}
              className="font-serif text-[9px] tracking-[0.22em] text-[#e6ca85] uppercase rotate-180 select-none font-semibold"
            >
              NOTICED · II
            </span>
          </div>

          {/* Bottom Embossed Ribs */}
          <div className="w-full px-2 flex flex-col gap-1 items-center">
            <div className="w-6 h-[1px] bg-[#e6ca85]/40" />
            <div className="w-6 h-[1.5px] bg-[#e6ca85]/75 shadow-xs" />
          </div>
        </motion.div>

        {/* BOOK 3: Right - Tilted / Leaning */}
        <motion.div
          initial={{ opacity: 0, rotate: 15 }}
          animate={{ opacity: 1, rotate: 21 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
          }}
          className="relative w-[34px] h-[142px] rounded-t-[4px] rounded-b-[2px] shadow-[8px_16px_28px_rgba(0,0,0,0.5)] flex flex-col justify-between py-3 items-center z-10 origin-bottom-left -ml-1 cursor-default"
          style={{
            background: "linear-gradient(180deg, #1d3326 0%, #0f1c14 100%)",
            borderLeft: "1px solid rgba(255,255,255,0.12)",
            borderRight: "1px solid rgba(0,0,0,0.65)",
            borderTop: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          {/* Exposed Deckled Pages Edge along right side */}
          <div
            className="absolute top-1 right-0 bottom-1 w-[4.5px] pointer-events-none rounded-r-xs opacity-85"
            style={{
              background: "linear-gradient(90deg, rgba(235,225,200,0.9), rgba(200,190,165,0.7))",
              boxShadow: "inset 1px 0 2px rgba(0,0,0,0.25)",
            }}
          />

          {/* Golden Silk Bookmark Ribbon */}
          <div className="absolute -top-1.5 left-2.5 w-[2.5px] h-14 bg-gradient-to-b from-[#e6ca85] via-[#d4af37] to-[#b38e28] rounded-full shadow-sm z-30 pointer-events-none" />

          {/* Top Foil Band */}
          <div className="w-5 h-[1.5px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent" />

          {/* Vertical Foil Title */}
          <div className="flex flex-col items-center">
            <span
              style={{ writingMode: "vertical-rl" }}
              className="font-serif text-[8.5px] tracking-[0.25em] text-[#d4af37]/85 uppercase rotate-180 select-none font-medium"
            >
              MARGINALIA · III
            </span>
          </div>

          {/* Bottom Foil Rib */}
          <div className="w-5 h-[1.5px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent" />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SLIDE 2: The Minimalist Brass Hourglass (Mindful Time & Reflection)
// ============================================================================
function ZenHourglassHero() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="relative w-72 h-44 sm:h-48 mb-3 flex items-center justify-center select-none"
    >
      {/* Soft Ambient Radial Candlelight */}
      <div className="absolute inset-0 bg-radial from-amber-500/12 via-amber-700/5 to-transparent blur-3xl pointer-events-none" />

      {/* Slowly Rotating Minimal Celestial Zen Orbit */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        className="absolute w-36 h-36 rounded-full border border-amber-500/20 pointer-events-none flex items-start justify-center"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80 -translate-y-1 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
      </motion.div>

      {/* Floor Contact Shadow */}
      <div className="absolute -bottom-1 w-32 h-3 rounded-[100%] bg-black/60 blur-[6px] pointer-events-none" />

      {/* Floating Brass Hourglass */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-20 h-32 flex flex-col items-center justify-between py-1"
        style={{
          filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.65))",
        }}
      >
        {/* Top Brass Plate */}
        <div className="w-16 h-2 rounded-full bg-gradient-to-r from-[#8a6c1e] via-[#e6ca85] to-[#8a6c1e] border-t border-white/40 shadow-xs relative flex items-center justify-center">
          <div className="w-2 h-1 rounded-t-full bg-[#f3de98] -top-1 absolute" />
        </div>

        {/* Spindle Brass Pillars and Glass Bulbs */}
        <div className="relative w-14 h-26 flex items-center justify-center my-0.5">
          {/* Left Brass Pillar */}
          <div className="absolute left-0 inset-y-0 w-1 bg-gradient-to-r from-[#6e5414] via-[#e6ca85] to-[#4d3b0e] rounded-full shadow-xs" />
          {/* Right Brass Pillar */}
          <div className="absolute right-0 inset-y-0 w-1 bg-gradient-to-r from-[#4d3b0e] via-[#e6ca85] to-[#6e5414] rounded-full shadow-xs" />

          {/* Hand-blown Translucent Glass Body */}
          <div className="w-11 h-full relative flex flex-col items-center justify-between overflow-hidden">
            <svg viewBox="0 0 44 96" className="w-full h-full">
              <defs>
                <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="30%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="85%" stopColor="rgba(255,255,255,0.25)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.45)" />
                </linearGradient>
                <linearGradient id="amberSand" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fae8b2" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#967722" />
                </linearGradient>
              </defs>

              {/* Glass Hourglass Outline with warm amber refraction */}
              <path
                d="M 4,4 C 4,24 18,38 20,48 C 18,58 4,72 4,92 L 40,92 C 40,72 26,58 24,48 C 26,38 40,24 40,4 Z"
                fill="rgba(212,175,55,0.04)"
                stroke="rgba(180,145,65,0.4)"
                strokeWidth="1.2"
              />

              {/* Inner Specular Highlight Curve */}
              <path
                d="M 6,6 C 6,24 19,37 20.5,47"
                stroke="url(#glassReflection)"
                strokeWidth="1"
                fill="none"
              />

              {/* Top Bulb Settled Sand */}
              <path
                d="M 10,24 C 14,32 19,40 21,46 L 23,46 C 25,40 30,32 34,24 Z"
                fill="url(#amberSand)"
                opacity="0.85"
              />

              {/* Trickling Stream Line */}
              <line
                x1="22"
                y1="46"
                x2="22"
                y2="78"
                stroke="#fae8b2"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                className="animate-pulse"
              />

              {/* Bottom Bulb Sand Mound */}
              <path
                d="M 8,90 C 14,80 30,80 36,90 Z"
                fill="url(#amberSand)"
                opacity="0.95"
              />
            </svg>
          </div>
        </div>

        {/* Bottom Brass Plate */}
        <div className="w-16 h-2 rounded-full bg-gradient-to-r from-[#8a6c1e] via-[#e6ca85] to-[#8a6c1e] border-b border-black/40 shadow-xs relative flex items-center justify-center">
          <div className="w-2 h-1 rounded-b-full bg-[#8a6c1e] -bottom-1 absolute" />
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

  // Auto-advancing Carousel State (3 Slides, resets timer on each advance or manual navigation)
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4500);
    return () => clearInterval(timer);
  }, [currentSlide, totalSlides]);

  const goToSlide = (idx: number) => {
    triggerHaptic("light");
    setCurrentSlide(idx);
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

      {/* CENTER HERO CAROUSEL: 3 Varied Non-Card Visuals (Swipeable & Auto-advancing) */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-2 text-center z-10 max-w-md mx-auto w-full">
        <div className="w-full flex flex-col items-center">
          {/* Swiping gesture area */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -35) {
                triggerHaptic("light");
                setCurrentSlide((prev) => (prev + 1) % totalSlides);
              } else if (info.offset.x > 35) {
                triggerHaptic("light");
                setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
              }
            }}
            className="w-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <AnimatePresence mode="wait">
              {currentSlide === 0 && (
                <motion.div
                  key="hero-slide-0"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <FountainPenHero />
                </motion.div>
              )}

              {currentSlide === 1 && (
                <motion.div
                  key="hero-slide-1"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArchivalVolumesHero />
                </motion.div>
              )}

              {currentSlide === 2 && (
                <motion.div
                  key="hero-slide-2"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <ZenHourglassHero />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Headline & Subtitle per slide */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`headline-${currentSlide}-${currentLang}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-2 max-w-sm mx-auto pt-1"
            >
              {currentSlide === 0 ? (
                <>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.18]">
                    {currentLang === "id"
                      ? "Abadikan keheningan catatan keseharian."
                      : "Notice the quiet beauty of everyday thoughts."}
                  </h1>
                  <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                    {currentLang === "id"
                      ? "Menulis hening dengan kenyamanan tipografi dan sentuhan pena digital."
                      : "Capture observations with mindful focus and poetic clarity."}
                  </p>
                </>
              ) : currentSlide === 1 ? (
                <>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.18]">
                    {currentLang === "id"
                      ? "Jilid catatan yang menyimpan pikiran."
                      : "Volumes that hold a lifetime of reflection."}
                  </h1>
                  <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                    {currentLang === "id"
                      ? "Susun jurnal Anda dalam jilid-jilid buku yang elegan dan teratur."
                      : "Organize your observations into bespoke archival notebooks."}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.18]">
                    {currentLang === "id"
                      ? "Suaka hening jauh dari kebisingan."
                      : "A quiet sanctuary away from the noise."}
                  </h1>
                  <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                    {currentLang === "id"
                      ? "Privat, offline-first, dan dirancang untuk perenungan yang mendalam."
                      : "Private, offline-first, and crafted for deep contemplation."}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* 3 Pagination Dots (Auto-advancing & Clickable) */}
          <div className="flex items-center justify-center gap-2 pt-4 pb-1">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className="p-1 cursor-pointer focus:outline-none"
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentSlide === idx
                      ? "w-6 bg-[var(--text-primary)]"
                      : "w-1.5 bg-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
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
