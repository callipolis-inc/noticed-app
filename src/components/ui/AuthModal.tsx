import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  sendPasswordResetEmail,
} from "@/lib/supabase";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
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
  Eye,
  EyeOff,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (email: string) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  useLockBodyScroll(isOpen);

  // Apple App Store Guideline 4.8 Protection:
  // Hide third-party OAuth (Google) on native iOS when Sign in with Apple is not configured
  const isNativeIOS =
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "ios";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "success">(
    "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setMode("signin");
      setPassword("");
      setErrorMessage(null);
      setInfoMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle Email + Password Sign In or Instant Sign Up
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      triggerHaptic("heavy");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      triggerHaptic("heavy");
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      if (mode === "signup") {
        const data = await signUpWithPassword(cleanEmail, password);

        // Rule 1: Instant Sign-Up (Auto-Login in 1s when Confirm Email is OFF and session is returned)
        if (data?.session) {
          triggerSuccessHaptic();
          setMode("success");
          setTimeout(() => {
            onAuthSuccess(cleanEmail);
            onClose();
          }, 800);
        } else {
          // Fallback if Confirm Email is still enabled on server
          triggerSuccessHaptic();
          setInfoMessage(
            "Account created! Please check your email inbox to confirm your account before signing in."
          );
          setMode("signin");
        }
      } else {
        const data = await signInWithPassword(cleanEmail, password);
        if (data?.session || data?.user) {
          triggerSuccessHaptic();
          setMode("success");
          setTimeout(() => {
            onAuthSuccess(cleanEmail);
            onClose();
          }, 800);
        }
      }
    } catch (err: any) {
      triggerHaptic("heavy");
      setErrorMessage(
        err?.message || "Authentication failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password (via Supabase Custom Gmail SMTP)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      triggerHaptic("heavy");
      setErrorMessage("Please enter your account email address.");
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      await sendPasswordResetEmail(cleanEmail);
      triggerSuccessHaptic();
      setInfoMessage(
        `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox.`
      );
    } catch (err: any) {
      triggerHaptic("heavy");
      setErrorMessage(
        err?.message || "Failed to send password reset email. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google OAuth (Web & Android only)
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      await signInWithGoogle();
    } catch (err: any) {
      triggerHaptic("heavy");
      setErrorMessage(
        err?.message || "Could not start Google Sign-In. Please try again."
      );
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-start justify-center p-3 sm:p-4 pointer-events-none">
        {/* Backdrop Glass Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
        />

        {/* Top Floating Liquid Glass Shell */}
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[440px] dynamic-island-shell rounded-3xl p-6 sm:p-7 overflow-hidden z-10 pointer-events-auto select-text"
          style={{
            marginTop:
              "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)",
          }}
        >
          {/* Top Specular Rim */}
          <div className="dynamic-island-specular-rim" />

          {/* Close Pill */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* SIGN IN & INSTANT SIGN UP VIEW */}
          {(mode === "signin" || mode === "signup") && (
            <div>
              {/* Header */}
              <div className="text-center mb-5 pt-1">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm">
                  <Cloud className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  {mode === "signup" ? "Create Cloud Account" : "Noticed Cloud"}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-[280px] mx-auto leading-relaxed">
                  {mode === "signup"
                    ? "Instant sign-up to back up and synchronize your notebooks across devices."
                    : "Sign in to keep your notebooks, marginalia, and field notes synchronized."}
                </p>
              </div>

              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]/40 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setMode("signin");
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    mode === "signin"
                      ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setMode("signup");
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    mode === "signup"
                      ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <div className="apple-sub-box p-3.5 flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none font-sans select-text"
                  />
                </div>

                <div className="apple-sub-box p-3.5 flex items-center gap-3">
                  <KeyRound className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "signup"
                        ? "Create password (min. 6 chars)"
                        : "Enter your password"
                    }
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none font-sans select-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-0.5 shrink-0"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Forgot Password Link (Sign In mode) */}
                {mode === "signin" && (
                  <div className="flex justify-end px-1">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setErrorMessage(null);
                        setInfoMessage(null);
                        setMode("forgot");
                      }}
                      className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {infoMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email.trim() || !password}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isLoading ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {mode === "signup"
                          ? "Create Account & Sign In"
                          : "Sign In"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Rule 3: Apple Guideline 4.8 Protection — Only show Google OAuth on non-iOS platforms */}
              {!isNativeIOS && (
                <div className="mt-4 space-y-3">
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-[var(--glass-border)]/50 w-full" />
                    <span className="px-3 text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)] bg-transparent shrink-0">
                      or
                    </span>
                    <div className="border-t border-[var(--glass-border)]/50 w-full" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-2xl inner-pseudo-glass border border-[var(--glass-border)] text-[var(--text-primary)] font-medium text-xs flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.79 0-.8-.08-1.57-.23-2.31l.13.38z"
                      />
                      <path
                        fill="currentColor"
                        d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.26 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.59H-.1v3.74C2.54 18.42 7.01 22 12.18 22z"
                      />
                      <path
                        fill="currentColor"
                        d="M3.22 13.44c-.32-.96-.5-1.99-.5-3.05s.18-2.09.5-3.05V3.6H-.1C-1.18 5.75-1.8 8.19-1.8 10.39s.62 4.64 1.7 6.79l3.32-3.74z"
                      />
                      <path
                        fill="currentColor"
                        d="M12.18 4.75c2.35 0 4.46.81 6.12 2.4l4.59-4.59C20.12.98 16.5 0 12.18 0 7.01 0 2.54 3.58-.1 8.82l3.32 3.74c1.26-3.78 4.79-6.59 8.96-6.59z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>
              )}

              {/* Sub-Action: Continue Offline */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  Continue offline without cloud sync
                </button>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD VIEW (Rule 2: Transactional Email Only for Password Reset) */}
          {mode === "forgot" && (
            <div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setMode("signin");
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-4 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>

              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm">
                  <KeyRound className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  Reset Password
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                  Enter your email address and we will send you a link to reset
                  your password.
                </p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="apple-sub-box p-3.5 flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none font-sans select-text"
                  />
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {infoMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isLoading ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* SUCCESS STATE */}
          {mode === "success" && (
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
    </AnimatePresence>,
    document.body
  );
}
