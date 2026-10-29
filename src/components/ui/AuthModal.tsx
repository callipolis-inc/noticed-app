import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithApple,
  signInWithGoogle,
  sendPasswordResetEmail,
} from "@/lib/supabase";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useAppLanguage } from "@/lib/i18n";
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
  const [currentLang] = useAppLanguage();
  const isId = currentLang === "id";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "success">(
    "signin",
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

  // Anti-hang safety timeout & window focus listener for OAuth
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

  // Handle Email + Password Sign In or Instant Sign Up
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      triggerHaptic("heavy");
      setErrorMessage(
        isId
          ? "Silakan masukkan alamat email yang valid."
          : "Please enter a valid email address.",
      );
      return;
    }

    if (password.length < 6) {
      triggerHaptic("heavy");
      setErrorMessage(
        isId
          ? "Kata sandi minimal harus 6 karakter."
          : "Password must be at least 6 characters.",
      );
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      if (mode === "signup") {
        const data = await signUpWithPassword(cleanEmail, password);

        if (data?.session) {
          triggerSuccessHaptic();
          setMode("success");
          setTimeout(() => {
            onAuthSuccess(cleanEmail);
            onClose();
          }, 800);
        } else {
          triggerSuccessHaptic();
          setInfoMessage(
            isId
              ? "Akun berhasil dibuat! Silakan periksa kotak masuk email Anda untuk konfirmasi sebelum masuk."
              : "Account created! Please check your email inbox to confirm your account before signing in.",
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
        err?.message ||
          (isId
            ? "Autentikasi gagal. Periksa kembali email dan kata sandi Anda."
            : "Authentication failed. Please check your credentials."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      triggerHaptic("heavy");
      setErrorMessage(
        isId
          ? "Silakan masukkan alamat email akun Anda."
          : "Please enter your account email address.",
      );
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
        isId
          ? `Instruksi pengaturan ulang kata sandi telah dikirim ke ${cleanEmail}. Silakan periksa kotak masuk Anda.`
          : `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox.`,
      );
    } catch (err: any) {
      triggerHaptic("heavy");
      setErrorMessage(
        err?.message ||
          (isId
            ? "Gagal mengirim email reset kata sandi. Silakan coba lagi."
            : "Failed to send password reset email. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Native Apple Sign-In
  const handleAppleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      const res = await signInWithApple();
      if (!res) {
        return;
      }
      if (res && "user" in res && res.user?.id) {
        const resolvedEmail =
          res.user.email ||
          res.user.user_metadata?.email ||
          `apple_${res.user.id.slice(0, 8)}@privaterelay.appleid.com`;
        onAuthSuccess(resolvedEmail);
        onClose();
      }
    } catch (err: any) {
      const isCancel =
        err?.message?.toLowerCase().includes("cancel") ||
        err?.message?.includes("1001") ||
        err?.code === 1001 ||
        err?.code === "1001";

      if (isCancel) {
        return;
      }

      triggerHaptic("heavy");
      setErrorMessage(
        err?.message ||
          (isId
            ? "Gagal masuk dengan Apple. Silakan coba lagi."
            : "Sign in with Apple failed. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In (Native iOS bottom sheet or Web fallback)
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      const res = await signInWithGoogle();
      if (!res) {
        return;
      }
      if (res && "user" in res && res.user?.id) {
        const resolvedEmail =
          res.user.email ||
          res.user.user_metadata?.email ||
          `google_${res.user.id.slice(0, 8)}@gmail.com`;
        onAuthSuccess(resolvedEmail);
        onClose();
      }
    } catch (err: any) {
      const isCancel =
        err?.message?.toLowerCase().includes("cancel") ||
        err?.message?.toLowerCase().includes("batal") ||
        err?.message?.includes("12501") ||
        err?.code === 12501 ||
        err?.code === "12501" ||
        err?.code === "SIGN_IN_CANCELED" ||
        err?.message?.includes("SIGN_IN_CANCELED");

      if (isCancel) {
        return;
      }

      triggerHaptic("heavy");
      setErrorMessage(
        err?.message ||
          (isId
            ? "Gagal masuk dengan Google. Silakan coba lagi."
            : "Could not complete Google Sign-In. Please try again."),
      );
    } finally {
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
            aria-label={isId ? "Tutup" : "Close"}
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
                  {mode === "signup"
                    ? isId
                      ? "Buat Akun Cloud"
                      : "Create Cloud Account"
                    : "Noticed Cloud"}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-[280px] mx-auto leading-relaxed">
                  {mode === "signup"
                    ? isId
                      ? "Daftar instan untuk mencadangkan dan menyinkronkan buku catatan Anda di semua perangkat."
                      : "Instant sign-up to back up and synchronize your notebooks across devices."
                    : isId
                      ? "Masuk untuk menjaga buku catatan, catatan pinggir, dan jurnal Anda tetap tersinkronisasi."
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
                  {isId ? "Masuk" : "Sign In"}
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
                  {isId ? "Buat Akun" : "Create Account"}
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
                        ? isId
                          ? "Buat kata sandi (min. 6 karakter)"
                          : "Create password (min. 6 chars)"
                        : isId
                          ? "Masukkan kata sandi Anda"
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
                    aria-label={
                      showPassword
                        ? isId
                          ? "Sembunyikan sandi"
                          : "Hide password"
                        : isId
                          ? "Tampilkan sandi"
                          : "Show password"
                    }
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
                      {isId ? "Lupa kata sandi?" : "Forgot password?"}
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div
                    style={{
                      backgroundColor: "rgba(158, 59, 51, 0.1)",
                      borderColor: "rgba(158, 59, 51, 0.25)",
                      color: "#9e3b33",
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl border text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {infoMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--text-primary)]/8 border border-[var(--glass-border)] text-[var(--text-primary)] text-xs">
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
                          ? isId
                            ? "Buat Akun & Masuk"
                            : "Create Account & Sign In"
                          : isId
                            ? "Masuk"
                            : "Sign In"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Social Login: Native Apple Sign In & Google */}
              <div className="mt-4 space-y-2.5">
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-[var(--glass-border)]/50 w-full" />
                  <span className="px-3 text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)] bg-transparent shrink-0">
                    {isId ? "atau" : "or"}
                  </span>
                  <div className="border-t border-[var(--glass-border)]/50 w-full" />
                </div>

                {/* Sign in with Apple (Native on iOS, web OAuth on browser) */}
                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-medium text-xs flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <svg
                    className="w-4 h-4 fill-current mb-0.5"
                    viewBox="0 0 170 170"
                  >
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.97-14.42-6.19-9.58-10.9-20.58-14.13-33-3.23-12.42-4.85-24.1-4.85-35.03 0-14.92 3.8-27.42 11.41-37.5 7.61-10.08 17.18-15.22 28.72-15.42 4.9 0 10.37 1.34 16.42 4.02 6.05 2.68 10.22 4.09 12.51 4.22 1.96 0 6.32-1.46 13.08-4.38 6.76-2.92 12.35-4.14 16.78-3.66 12.63 1.09 22.86 6.03 30.68 14.81-11.09 6.76-16.53 16.22-16.32 28.38.22 9.58 3.91 17.58 11.08 24 7.17 6.42 15.67 10.05 25.5 10.89-2.18 6.76-4.79 13.62-7.83 20.58zM119.22 33.09c0-7.39 2.61-14.28 7.83-20.67 5.22-6.39 11.75-10.45 19.59-12.18.22 1.3.33 2.41.33 3.32 0 7.39-2.73 14.43-8.19 21.12-5.46 6.69-12.08 10.59-19.86 11.7-.1-.99-.3-1.99-.7-3.29z" />
                  </svg>
                  <span>
                    {isId ? "Lanjutkan dengan Apple" : "Sign in with Apple"}
                  </span>
                </button>

                {/* Continue with Google */}
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
                  <span>
                    {isId
                      ? "Lanjutkan dengan Google"
                      : "Continue with Google"}
                  </span>
                </button>
              </div>

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
                  {isId
                    ? "Lanjutkan offline tanpa sinkronisasi cloud"
                    : "Continue offline without cloud sync"}
                </button>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD VIEW */}
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
                <span>{isId ? "Kembali ke Masuk" : "Back to Sign In"}</span>
              </button>

              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm">
                  <KeyRound className="w-6 h-6 text-[var(--text-primary)]" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                  {isId ? "Atur Ulang Kata Sandi" : "Reset Password"}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                  {isId
                    ? "Masukkan alamat email Anda dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi."
                    : "Enter your email address and we will send you a link to reset your password."}
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
                  <div
                    style={{
                      backgroundColor: "rgba(158, 59, 51, 0.1)",
                      borderColor: "rgba(158, 59, 51, 0.25)",
                      color: "#9e3b33",
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl border text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {infoMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--text-primary)]/8 border border-[var(--glass-border)] text-[var(--text-primary)] text-xs">
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
                      <span>
                        {isId ? "Kirim Tautan Reset" : "Send Reset Link"}
                      </span>
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
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-[var(--text-primary)]/10 text-[var(--text-primary)] border border-[var(--glass-border)]">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                {isId ? "Berhasil Masuk" : "Signed In Successfully"}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                {isId
                  ? "Menghubungkan ke Noticed Cloud dan menyinkronkan buku catatan Anda..."
                  : "Connecting to Noticed cloud and synchronizing your notebooks..."}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
