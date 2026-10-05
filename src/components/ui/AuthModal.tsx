import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/supabase";
import {
  X,
  Mail,
  KeyRound,
  ArrowRight,
  RotateCw,
  Check,
  AlertCircle,
  Cloud,
  ArrowLeft,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (email: string) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep("email");
      setOtp(["", "", "", "", "", ""]);
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      triggerHaptic("heavy");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      await sendEmailOtp(cleanEmail);
      triggerSuccessHaptic();
      setStep("otp");
      setResendCooldown(60);
      // Auto-focus first OTP digit after transition
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 250);
    } catch (err: any) {
      triggerHaptic("heavy");
      setErrorMessage(
        err?.message || "Failed to send code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit change
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric input
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const nextOtp = [...otp];
      nextOtp[index] = "";
      setOtp(nextOtp);
      return;
    }

    // Single digit input
    const char = clean[clean.length - 1];
    const nextOtp = [...otp];
    nextOtp[index] = char;
    setOtp(nextOtp);
    triggerHaptic("light");

    // Auto-advance to next input
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are filled
    const fullCode = nextOtp.join("");
    if (fullCode.length === 6) {
      submitOtpCode(fullCode);
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (pastedData.length > 0) {
      const nextOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        nextOtp[i] = pastedData[i] || "";
      }
      setOtp(nextOtp);
      triggerHaptic("medium");

      const focusIndex = Math.min(pastedData.length, 5);
      otpInputRefs.current[focusIndex]?.focus();

      if (pastedData.length === 6) {
        submitOtpCode(pastedData);
      }
    }
  };

  // Submit OTP Verification
  const submitOtpCode = async (tokenToVerify?: string) => {
    const code = tokenToVerify || otp.join("");
    if (code.length !== 6) {
      triggerHaptic("heavy");
      setErrorMessage("Please enter all 6 digits.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      await verifyEmailOtp(email.trim().toLowerCase(), code);
      triggerSuccessHaptic();
      setStep("success");
      setTimeout(() => {
        onAuthSuccess(email.trim().toLowerCase());
        onClose();
      }, 1200);
    } catch (err: any) {
      triggerHaptic("heavy");
      setErrorMessage(
        err?.message || "Invalid or expired code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 select-none">
        {/* Backdrop Glass Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-md"
        />

        {/* Top Floating Liquid Glass Shell */}
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-[440px] dynamic-island-shell rounded-3xl p-6 sm:p-7 overflow-hidden z-10"
          style={{
            marginTop:
              "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)",
          }}
        >
          {/* Top Specular Rim */}
          <div className="dynamic-island-specular-rim" />

          {/* Close Pill */}
          <button
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* STEP 1: EMAIL ADDRESS INPUT */}
          {step === "email" && (
            <div>
              {/* Header */}
              <div className="text-center mb-6 pt-2">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm">
                  <Cloud className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  Noticed Cloud
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                  Sign in to keep your notebooks, marginalia, and field notes
                  synchronized across devices.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="apple-sub-box p-3.5 flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none font-sans"
                  />
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40"
                >
                  {isLoading ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send 6-Digit Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Sub-Action: Continue Offline */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Continue offline without cloud sync
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
          {step === "otp" && (
            <div>
              {/* Back button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setStep("email");
                  setErrorMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change email</span>
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm">
                  <KeyRound className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  Enter Passcode
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                  We sent a 6-digit verification code to{" "}
                  <strong className="text-[var(--text-primary)] font-medium">
                    {email}
                  </strong>
                </p>
              </div>

              {/* 6-Digit In-App Input Boxes */}
              <div
                className="flex items-center justify-center gap-2 sm:gap-2.5 mb-5"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-11 h-14 sm:w-12 sm:h-14 text-center font-mono text-xl font-semibold rounded-2xl apple-sub-box text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--text-primary)]/30 transition-all shadow-inner"
                  />
                ))}
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => submitOtpCode()}
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full py-3.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40"
              >
                {isLoading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Verify & Sign In</span>
                )}
              </button>

              {/* Resend Code Option */}
              <div className="mt-5 text-center">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-[var(--text-tertiary)]">
                    Resend code in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={isLoading}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium underline underline-offset-4 transition-colors"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === "success" && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                Signed In Successfully
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                Connecting to Noticed cloud and synchronizing your notebooks...
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
