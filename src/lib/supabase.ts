import { createClient, type User, type Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import {
  SignInWithApple,
  type SignInWithAppleResponse,
} from "@capacitor-community/apple-sign-in";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

/**
 * Resilient promise timeout wrapper to prevent auth hanging on poor / interrupted network
 */
export function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  ms = 20000,
  timeoutMessage = "Network request timed out (20s). Please check your internet connection."
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    timeoutPromise,
  ]);
}

/**
 * Resilient timeout + auto-retry wrapper specifically designed for volatile mobile WiFi / IPv6 routing drops
 */
export async function withRetryTimeout<T>(
  operation: () => Promise<T>,
  ms = 12000,
  maxRetries = 1,
  timeoutMessage = "Network request timed out. Please check your internet connection."
): Promise<T> {
  let attempt = 0;
  while (true) {
    let timer: any;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, ms);
      });

      const result = await Promise.race([
        operation().finally(() => clearTimeout(timer)),
        timeoutPromise,
      ]);
      return result;
    } catch (err: any) {
      clearTimeout(timer);
      attempt++;
      const isNetworkOrTimeout =
        err?.message?.includes("timed out") ||
        err?.message?.toLowerCase().includes("network") ||
        err?.message?.toLowerCase().includes("failed to fetch") ||
        err?.message?.toLowerCase().includes("abort");

      if (attempt <= maxRetries && isNetworkOrTimeout) {
        console.warn(`[Supabase] Network attempt ${attempt} interrupted, retrying immediately...`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      throw err;
    }
  }
}

export function getAuthRedirectUrl(): string {
  if (typeof window === "undefined") return "http://localhost:5174";

  if (Capacitor.isNativePlatform()) {
    return "com.syntheticae.noticed://auth/callback";
  }

  // In browser or PWA: use clean active origin
  return window.location.origin.replace(/\/+$/, "");
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Noticed] Supabase credentials not found in environment variables. Offline mode only."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("placeholder")
);

/**
 * Instant Sign-Up with Email & Password (supports auto-login when Confirm Email is OFF)
 */
export async function signUpWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const { data, error } = await withRetryTimeout(
    () =>
      supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      }),
    14000,
    1,
    "Sign-up request timed out. Please check your connection."
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign-In with Email & Password
 */
export async function signInWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const { data, error } = await withRetryTimeout(
    () =>
      supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      }),
    14000,
    1,
    "Sign-in request timed out. Please check your connection."
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Native Sign-In with Apple (Apple App Store Guideline 4.8 Compliance)
 * On native iOS: utilizes 100% in-app Face ID / Touch ID bottom sheet with ZERO Safari redirect.
 * If user cancels (code 1001 / 'canceled'), resolves silently with null.
 */
export async function signInWithApple() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  // 1. Native iOS flow (In-app Face ID / Passcode sheet, NO Safari redirect)
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
    try {
      const result: SignInWithAppleResponse = await SignInWithApple.authorize({
        clientId: "com.syntheticae.noticed",
        redirectURI: "https://ienbkpjldpzaewzewxfz.supabase.co/auth/v1/callback",
        scopes: "email name",
      });

      const identityToken = result.response?.identityToken;
      if (!identityToken) {
        throw new Error("No identity token returned from Apple Sign-In.");
      }

      // Exchange Apple identity token directly with Supabase with resilient retry
      const { data, error } = await withRetryTimeout(
        () =>
          supabase.auth.signInWithIdToken({
            provider: "apple",
            token: identityToken,
          }),
        15000,
        1,
        "Sign in with Apple timed out. Please check your connection."
      );

      if (error) throw error;
      return data;
    } catch (appleErr: any) {
      // Detect user cancellation (ASAuthorizationError code 1001 or 'canceled')
      const isCancel =
        appleErr?.message?.toLowerCase().includes("cancel") ||
        appleErr?.message?.includes("1001") ||
        appleErr?.code === 1001 ||
        appleErr?.code === "1001";

      if (isCancel) {
        // Silently ignore cancellation - no red banner or error throw
        return null;
      }
      throw appleErr;
    }
  }

  // 2. Web / Android fallback: standard OAuth redirect
  const redirectTo = getAuthRedirectUrl();

  const { data, error } = await withTimeout(
    supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo,
      },
    }),
    20000,
    "Apple OAuth request timed out. Please check your connection."
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Native Sign-In with Google (Accrual Production Standard)
 * On native iOS: utilizes 100% in-app Google bottom sheet with ZERO Safari redirect and ZERO supabase.co domain display.
 * Exchanges Google idToken directly via supabase.auth.signInWithIdToken.
 * If user cancels/dismisses, resolves silently with null.
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  // 1. Native iOS flow (In-app Google Account sheet, ZERO Safari redirect, ZERO supabase.co display)
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
    try {
      await GoogleSignIn.initialize({
        clientId: "3178689480-cpe53gd57jhr7t73vcgi5r4jfj96v9fu.apps.googleusercontent.com",
      });

      // Generate secure cryptographic nonce (Accrual production standard)
      const rawNonce =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36);

      const result = await GoogleSignIn.signIn({
        nonce: rawNonce,
      });

      const idToken = result?.idToken;
      if (!idToken) {
        throw new Error("No identity token returned from Google Sign-In.");
      }

      // Exchange Google ID Token with Supabase (Accrual standard with rawNonce) with resilient retry
      const { data, error } = await withRetryTimeout(
        () =>
          supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
            nonce: rawNonce,
          }),
        18000,
        1,
        "Google authentication timed out. Please check your connection."
      );

      if (error) throw error;
      return data;
    } catch (googleErr: any) {
      // Detect user cancellation (code 12501, 'SIGN_IN_CANCELED', 'cancel', or 'batal')
      const isCancel =
        googleErr?.message?.toLowerCase().includes("cancel") ||
        googleErr?.message?.toLowerCase().includes("batal") ||
        googleErr?.message?.includes("12501") ||
        googleErr?.code === 12501 ||
        googleErr?.code === "12501" ||
        googleErr?.code === "SIGN_IN_CANCELED" ||
        googleErr?.message?.includes("SIGN_IN_CANCELED");

      if (isCancel) {
        // Silently ignore cancellation - no red banner or error throw
        return null;
      }
      throw googleErr;
    }
  }

  // 2. Web / Android fallback: standard OAuth redirect
  const redirectTo = getAuthRedirectUrl();

  const { data, error } = await withTimeout(
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    }),
    20000,
    "Google Sign-In request timed out. Please check your connection."
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sends a password reset email via Supabase Auth Custom SMTP (Gmail SMTP)
 */
export async function sendPasswordResetEmail(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const redirectTo = getAuthRedirectUrl();

  const { data, error } = await withTimeout(
    supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    }),
    20000,
    "Password reset request timed out. Please check your connection."
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sends a 6-digit OTP code to the provided email address
 */
export async function sendEmailOtp(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const { data, error } = await withTimeout(
    supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthRedirectUrl(),
      },
    }),
    20000,
    "OTP request timed out. Please check your connection."
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Verifies the 6-digit OTP code entered by the user
 */
export async function verifyEmailOtp(email: string, token: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const cleanToken = token.trim().replace(/\D/g, "");

  const { data, error } = await withRetryTimeout(
    () =>
      supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanToken,
        type: "email",
      }),
    15000,
    1,
    "OTP verification timed out. Please check your connection."
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Verifies the 6-digit confirmation token sent during email+password sign-up
 */
export async function verifySignupOtp(email: string, token: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const cleanToken = token.trim().replace(/\D/g, "");
  const cleanEmail = email.trim().toLowerCase();

  // Try type: "signup" first (standard Supabase registration confirmation)
  const { data, error } = await withTimeout(
    supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "signup",
    }),
    20000,
    "Signup OTP verification timed out. Please check your connection."
  );

  if (error) {
    // Fallback to type: "email" if project OTP template is unified
    const fallback = await withTimeout(
      supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "email",
      }),
      20000
    );

    if (fallback.error) {
      throw error;
    }
    return fallback.data;
  }

  return data;
}

/**
 * Resends the 6-digit signup confirmation code
 */
export async function resendSignupOtp(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await withTimeout(
    supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    }),
    20000,
    "Resend OTP timed out. Please check your connection."
  );

  if (error) {
    // Fallback to signInWithOtp if resend fails
    return sendEmailOtp(cleanEmail);
  }

  return data;
}

/**
 * Signs out the current user
 */
export async function signOutUser() {
  const { error } = await withTimeout(
    supabase.auth.signOut(),
    10000,
    "Sign-out request timed out."
  );
  if (error) {
    throw error;
  }
}

/**
 * Gets the current authenticated session
 */
export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Gets the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to authentication state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Updates the password for the current authenticated user
 */
export async function updateUserPassword(newPassword: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await withTimeout(
    supabase.auth.updateUser({
      password: newPassword,
    }),
    20000,
    "Password update request timed out."
  );
  if (error) {
    throw error;
  }
  return data;
}

/**
 * Permanently deletes the current authenticated user and all associated cloud data
 * Required for Apple App Store (Guideline 5.1.1(v)) and Google Play Data Safety Compliance.
 */
export async function deleteUserAccount(): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    // Invoke hardened PostgreSQL RPC function on server
    const rpcRes = await withTimeout(
      Promise.resolve(supabase.rpc("delete_user_account")),
      20000
    );
    if (rpcRes && typeof rpcRes === "object" && "error" in rpcRes && rpcRes.error) {
      console.error("[Noticed] Remote RPC delete_user_account failed:", rpcRes.error);
      throw new Error(rpcRes.error.message || "Failed to delete account on server.");
    }
  } finally {
    // Always sign out the session cleanly
    try {
      await withTimeout(supabase.auth.signOut(), 8000);
    } catch (e) {
      console.error("[Noticed] Error signing out during account deletion:", e);
    }
  }
}
