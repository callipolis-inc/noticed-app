import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { useAppLanguage, AppLanguage } from "@/lib/i18n";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithApple,
  signInWithGoogle,
  sendPasswordResetEmail,
  verifySignupOtp,
  resendSignupOtp,
  sendEmailOtp,
  verifyEmailOtp,
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
  Compass,
  KeyRound,
  RefreshCw,
} from "lucide-react";

interface OnboardingGateProps {
  onAuthSuccess: (email: string, userId?: string) => void;
  onContinueAsGuest: () => void;
  currentLanguage?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
}

type AuthMode = "signin" | "signup" | "forgot";

export function OnboardingGate({
  onAuthSuccess,
  onContinueAsGuest,
  currentLanguage,
  onLanguageChange,
}: OnboardingGateProps) {
  const [internalLang, setInternalLanguage] = useAppLanguage();
  const currentLang = currentLanguage || internalLang;
  const setLanguage = (newLang: AppLanguage) => {
    setInternalLanguage(newLang);
    onLanguageChange?.(newLang);
  };
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authStep, setAuthStep] = useState<"credentials" | "otp">("credentials");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpType, setOtpType] = useState<"signup" | "magiclink">("signup");
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
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
    }, 4000);
    return () => clearInterval(timer);
  }, [currentSlide, totalSlides]);

  // Resend OTP Countdown Timer
  useEffect(() => {
    let interval: any;
    if (authStep === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authStep, resendTimer]);

  // Anti-hang safety timeout & window focus listener for Google / Apple OAuth
  useEffect(() => {
    let safetyTimeout: any;

    if (isLoading) {
      safetyTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 10000);
    }

    const handleFocus = () => {
      if (isLoading) {
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      if (safetyTimeout) clearTimeout(safetyTimeout);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [isLoading]);

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
    setAuthStep("credentials");
    setErrorMessage(null);
    setInfoMessage(null);
    setOtpDigits(["", "", "", "", "", ""]);
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
          // Email confirmation is required by Supabase -> Transition smoothly to In-App OTP confirmation!
          setAuthStep("otp");
          setOtpType("signup");
          setResendTimer(60);
          setCanResend(false);
          setOtpDigits(["", "", "", "", "", ""]);
          setInfoMessage(
            currentLang === "id"
              ? "Kode konfirmasi 6 digit telah dikirim ke email Anda. Masukkan di bawah untuk mengaktifkan akun."
              : "A 6-digit confirmation code was sent to your email. Enter it below to activate your account.",
          );
          setTimeout(() => {
            otpInputRefs.current[0]?.focus();
          }, 300);
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

      // If email is not yet confirmed, seamlessly transition to OTP confirmation
      if (err?.message?.includes("Email not confirmed")) {
        setAuthStep("otp");
        setOtpType("signup");
        setResendTimer(60);
        setCanResend(false);
        setOtpDigits(["", "", "", "", "", ""]);
        setInfoMessage(
          currentLang === "id"
            ? "Akun Anda belum diverifikasi. Kode baru telah dikirim, silakan masukkan 6 digit kode."
            : "Your account is not verified yet. A code has been sent, please enter the 6-digit code.",
        );
        resendSignupOtp(cleanEmail).catch(() => {});
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 300);
        return;
      }

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

  const handleRequestMagicOtp = async () => {
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

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    triggerHaptic("medium");

    try {
      await sendEmailOtp(cleanEmail);
      triggerSuccessHaptic();
      setAuthStep("otp");
      setOtpType("magiclink");
      setResendTimer(60);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setInfoMessage(
        currentLang === "id"
          ? "Kode OTP 6 digit telah dikirim ke email Anda."
          : "A 6-digit one-time code has been sent to your email.",
      );
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err: any) {
      triggerHaptic("heavy");
      setErrorMessage(
        err?.message ||
          (currentLang === "id"
            ? "Gagal mengirim kode OTP."
            : "Failed to send OTP code."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const token = (codeOverride || otpDigits.join("")).trim();
    if (token.length !== 6) {
      triggerHaptic("heavy");
      setErrorMessage(
        currentLang === "id"
          ? "Silakan lengkapi 6 digit kode verifikasi."
          : "Please enter all 6 digits of your verification code.",
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    triggerHaptic("medium");

    try {
      const cleanEmail = email.trim().toLowerCase();
      let resData: any = null;

      if (otpType === "signup") {
        resData = await verifySignupOtp(cleanEmail, token);
      } else {
        resData = await verifyEmailOtp(cleanEmail, token);
      }

      triggerSuccessHaptic();
      const verifiedUser = resData?.session?.user || resData?.user;
      if (verifiedUser) {
        onAuthSuccess(cleanEmail, verifiedUser.id);
      } else {
        onAuthSuccess(cleanEmail);
      }
    } catch (err: any) {
      triggerHaptic("heavy");
      console.warn("[OnboardingGate] OTP verify error:", err);
      setErrorMessage(
        err?.message?.includes("expired")
          ? (currentLang === "id"
              ? "Kode verifikasi telah kedaluwarsa. Silakan kirim ulang."
              : "Verification code has expired. Please request a new one.")
          : err?.message?.includes("invalid") || err?.message?.includes("Invalid")
            ? (currentLang === "id"
                ? "Kode verifikasi tidak cocok. Mohon periksa kembali."
                : "Incorrect verification code. Please check your inbox.")
            : err?.message ||
              (currentLang === "id"
                ? "Gagal memverifikasi kode."
                : "Failed to verify code."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    triggerHaptic("medium");

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (otpType === "signup") {
        await resendSignupOtp(cleanEmail);
      } else {
        await sendEmailOtp(cleanEmail);
      }
      triggerSuccessHaptic();
      setResendTimer(60);
      setCanResend(false);
      setInfoMessage(
        currentLang === "id"
          ? "Kode verifikasi baru telah dikirim ke email Anda."
          : "A fresh verification code has been dispatched to your email.",
      );
    } catch (err: any) {
      triggerHaptic("heavy");
      setErrorMessage(
        err?.message ||
          (currentLang === "id"
            ? "Gagal mengirim ulang kode."
            : "Failed to resend code."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "");

    // Handle full multi-digit paste (iOS 1-tap OTP paste)
    if (sanitized.length > 1) {
      triggerHaptic("medium");
      const digits = sanitized.slice(0, 6).split("");
      const newOtp = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpDigits(newOtp);
      const targetIdx = Math.min(digits.length, 5);
      otpInputRefs.current[targetIdx]?.focus();

      if (newOtp.filter(Boolean).length === 6) {
        handleVerifyOtp(newOtp.join(""));
      }
      return;
    }

    const char = sanitized.slice(-1);
    const newOtp = [...otpDigits];
    newOtp[index] = char;
    setOtpDigits(newOtp);

    if (char) {
      triggerHaptic("light");
      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      } else if (newOtp.filter(Boolean).length === 6) {
        handleVerifyOtp(newOtp.join(""));
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        triggerHaptic("light");
        const newOtp = [...otpDigits];
        newOtp[index - 1] = "";
        setOtpDigits(newOtp);
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOAuthApple = async () => {
    triggerHaptic("medium");
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithApple();
      if (!res) {
        // User canceled Apple sheet - silent exit without error banner
        setIsLoading(false);
        return;
      }
      if ("user" in res && res.user?.email) {
        onAuthSuccess(res.user.email, res.user.id);
      }
    } catch (err: any) {
      const isCancel =
        err?.message?.toLowerCase().includes("cancel") ||
        err?.message?.includes("1001") ||
        err?.code === 1001 ||
        err?.code === "1001";

      if (isCancel) {
        setIsLoading(false);
        return;
      }

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
      const res = await signInWithGoogle();
      if (!res) {
        // Silent cancellation (user dismissed sheet)
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      const isCancel =
        err?.message?.toLowerCase().includes("cancel") ||
        err?.message?.toLowerCase().includes("batal") ||
        err?.message?.includes("12501") ||
        err?.code === 12501 ||
        err?.code === "12501";

      if (isCancel) {
        setIsLoading(false);
        return;
      }

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
      {/* ATMOSPHERIC 3D PEBBLE HERO BACKGROUND */}
      <div className="absolute top-0 inset-x-0 h-[62%] sm:h-[66%] z-0 overflow-hidden flex items-center justify-center pointer-events-none select-none">
        {/* Subtle Ambient Radial Aura behind the pebble */}
        <div className="absolute w-80 h-80 rounded-full bg-radial from-amber-500/10 via-amber-700/5 to-transparent blur-3xl" />

        {/* Floating 3D Pebble Artwork */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            scale: [1, 1.015, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* Dark Mode master 3D render */}
          <img
            src="/hero-pebble-dark.png"
            alt="Noticed Brand Mark"
            loading="eager"
            decoding="async"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes("logo-dark.png")) {
                target.src = "/logo-dark.png";
              }
            }}
            className="w-full h-full object-cover scale-105 dark:block hidden"
            style={{ objectPosition: "center 25%" }}
          />
          {/* Light Mode master 3D render */}
          <img
            src="/hero-pebble-light.png"
            alt="Noticed Brand Mark"
            loading="eager"
            decoding="async"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes("logo-light.png")) {
                target.src = "/logo-light.png";
              }
            }}
            className="w-full h-full object-cover scale-105 dark:hidden block"
            style={{ objectPosition: "center 25%" }}
          />
        </motion.div>

        {/* Bottom smooth gradient fade into app background */}
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, var(--bg-primary) 100%)",
          }}
        />
        {/* Top safe area gradient fade for status bar */}
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, var(--bg-primary) 0%, transparent 100%)",
            opacity: 0.6,
          }}
        />
      </div>

      {/* TOP BAR: Clean editorial wordmark & Floating Language Pill */}
      <header
        className="relative w-full flex items-center justify-between px-6 z-20"
        style={{
          paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
        }}
      >
        <div className="flex items-center gap-2 select-none">
          {isAuthDrawerOpen ? (
            <button
              type="button"
              title="Close"
              aria-label="Close"
              onClick={() => {
                triggerHaptic("light");
                setIsAuthDrawerOpen(false);
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer py-1 px-2.5 -ml-2 rounded-full hover:bg-[var(--text-primary)]/5 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-serif tracking-tight text-xl font-bold text-[var(--text-primary)]">
                Noticed
              </span>
            </button>
          ) : (
            <span className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Noticed
            </span>
          )}
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

      {/* BODY FLOW: EITHER WELCOME ROTATING COPY OR INLINE AUTH (SAME BACKGROUND, ZERO BLUR) */}
      <AnimatePresence mode="wait">
        {!isAuthDrawerOpen ? (
          <motion.div
            key="welcome-flow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col justify-between w-full"
          >
            {/* CENTER COPY: Strictly 4-Word Header + 4-Word Desc */}
            <main className="relative flex-1 flex flex-col items-center justify-end px-6 pb-5 text-center z-10 max-w-md mx-auto w-full">
              {/* Swiping gesture area (swipe left/right to change message) */}
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
                className="w-full flex flex-col items-center cursor-grab active:cursor-grabbing"
              >
                {/* Headline & Subtitle per slide (strictly 4 words header + 4 words desc) */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`headline-${currentSlide}-${currentLang}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="space-y-1.5 max-w-sm mx-auto w-full px-2"
                  >
                    {currentSlide === 0 ? (
                      <>
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-sm">
                          {currentLang === "id"
                            ? "Ruang hening untuk pikiran."
                            : "Space for quiet thoughts."}
                        </h1>
                        <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-xs">
                          {currentLang === "id"
                            ? "Tulis observasi dengan jernih."
                            : "Mindful notes for reflection."}
                        </p>
                      </>
                    ) : currentSlide === 1 ? (
                      <>
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-sm">
                          {currentLang === "id"
                            ? "Jilid arsip yang abadi."
                            : "Volumes bound for life."}
                        </h1>
                        <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-xs">
                          {currentLang === "id"
                            ? "Susun jurnal dengan rapi."
                            : "Organize reflections into volumes."}
                        </p>
                      </>
                    ) : (
                      <>
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-sm">
                          {currentLang === "id"
                            ? "Suaka hening tanpa distraksi."
                            : "Sanctuary from the noise."}
                        </h1>
                        <p className="font-serif italic text-xs sm:text-sm text-[var(--text-secondary)] leading-snug whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-xs">
                          {currentLang === "id"
                            ? "Sepenuhnya privat dan offline."
                            : "Private, offline, deep focus."}
                        </p>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
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
          </motion.div>
        ) : (
          /* ==================================================================== */
          /* INLINE AUTHENTICATION VIEW (SAME BACKGROUND, NO MODAL SHEET, NO BLUR)  */
          /* ==================================================================== */
          <motion.div
            key="auth-flow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col justify-end w-full max-w-md mx-auto px-6 pb-6 z-20 overflow-y-auto scrollbar-none"
            style={{
              paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
            }}
          >
            {/* Header for Auth Mode */}
            <div className="text-center pb-2.5">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)] drop-shadow-sm">
                {authStep === "otp"
                  ? currentLang === "id"
                    ? "Verifikasi Kode 6-Digit"
                    : "Verify 6-Digit Code"
                  : authMode === "signup"
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
              </h2>
              <p className="font-serif italic text-xs text-[var(--text-secondary)] mt-0.5">
                {authStep === "otp"
                  ? currentLang === "id"
                    ? `Masukkan 6 digit angka yang dikirim ke ${email}`
                    : `Enter the 6-digit code sent to ${email}`
                  : authMode === "signup"
                    ? currentLang === "id"
                      ? "Daftar dengan email & kata sandi pribadi Anda."
                      : "Sign up with your personal email & password."
                    : authMode === "signin"
                      ? currentLang === "id"
                        ? "Masuk untuk mengakses perpustakaan Anda."
                        : "Sign in to access your library."
                      : currentLang === "id"
                        ? "Masukkan email untuk tautan pemulihan."
                        : "Enter email to receive recovery link."}
              </p>
            </div>

            {/* Status & Error Alerts */}
            {errorMessage && (
              <div className="mb-2.5 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans flex items-start gap-2">
                <span>{errorMessage}</span>
              </div>
            )}
            {infoMessage && (
              <div className="mb-2.5 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {authStep === "otp" ? (
              <div className="space-y-3.5 my-2">
                {/* 6 Digit Input Grid */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-1">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete={idx === 0 ? "one-time-code" : "off"}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-11 sm:w-12 h-14 rounded-2xl text-center font-mono text-xl sm:text-2xl font-bold transition-all shadow-xs outline-none select-none ${
                        digit
                          ? "bg-[var(--text-primary)]/10 text-[var(--text-primary)] border-2 border-[var(--text-primary)]/60 shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
                          : "inner-pseudo-glass border border-[var(--glass-border)] bg-[var(--card-bg)]/40 text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:scale-105"
                      }`}
                    />
                  ))}
                </div>

                {/* Verify Button */}
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={isLoading || otpDigits.filter(Boolean).length !== 6}
                  className="w-full h-11 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer shadow-md disabled:opacity-50 mt-1"
                >
                  {isLoading ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {currentLang === "id"
                          ? "Konfirmasi & Masuk"
                          : "Confirm & Enter"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Resend & Change Email Footer */}
                <div className="flex items-center justify-between text-xs px-1 text-[var(--text-tertiary)] pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setAuthStep("credentials");
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="hover:text-[var(--text-primary)] cursor-pointer inline-flex items-center gap-1 font-medium underline underline-offset-2"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>{currentLang === "id" ? "Ubah Email" : "Change Email"}</span>
                  </button>

                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-[var(--text-primary)] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{currentLang === "id" ? "Kirim Ulang Kode" : "Resend Code"}</span>
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                      {currentLang === "id"
                        ? `Kirim ulang (${resendTimer}s)`
                        : `Resend in ${resendTimer}s`}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* OAUTH SECTION (Only shown in signin and signup modes) */}
                {authMode !== "forgot" && (
                  <div className="space-y-2 mb-2.5">
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

                    <div className="relative flex items-center justify-center pt-1.5 pb-0.5">
                      <div className="w-full border-t border-[var(--glass-border)]/50" />
                      <span className="absolute px-2.5 bg-[var(--bg-primary)] text-[10px] font-sans text-[var(--text-tertiary)] uppercase tracking-wider">
                        {currentLang === "id" ? "atau email" : "or email"}
                      </span>
                    </div>
                  </div>
                )}

                {/* EMAIL & PASSWORD FORM */}
                <form onSubmit={handleEmailAuthSubmit} className="space-y-2.5">
                  {/* Email input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium">
                      {currentLang === "id" ? "Alamat Email" : "Email Address"}
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="author@atelier.com"
                        required
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="w-full h-11 pl-10 pr-3 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] bg-[var(--card-bg)]/40 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]/50 transition-colors shadow-xs"
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
                        <Lock className="absolute left-3.5 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full h-11 pl-10 pr-10 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] bg-[var(--card-bg)]/40 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]/50 transition-colors shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 w-5 h-5 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
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
                    className="w-full h-11 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer shadow-md disabled:opacity-50 mt-1"
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

                {/* Optional Quick In-App OTP for Returning Users */}
                {authMode === "signin" && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleRequestMagicOtp}
                      disabled={isLoading}
                      className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer inline-flex items-center gap-1.5 hover:underline"
                    >
                      <KeyRound className="w-3 h-3 text-[var(--text-tertiary)]" />
                      <span>
                        {currentLang === "id"
                          ? "Masuk cepat dengan Kode OTP Email"
                          : "Quick sign in with One-Time Code"}
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Mode Toggle Switcher at Bottom (Only in Credentials step) */}
            {authStep === "credentials" && (
              <div className="pt-3.5 text-center">
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
            )}
          </motion.div>
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
