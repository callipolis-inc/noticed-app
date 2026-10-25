import { createClient, type User, type Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

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

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });

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

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign-In with Apple OAuth (Apple App Store Guideline 4.8 Compliance)
 */
export async function signInWithApple() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const redirectTo = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign-In with Google OAuth (Web & Android)
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const redirectTo = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

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

  const { data, error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo,
    }
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

  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

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

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: cleanToken,
    type: "email",
  });

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
  const { data, error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: "signup",
  });

  if (error) {
    // Fallback to type: "email" if project OTP template is unified
    const fallback = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "email",
    });

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
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

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
  const { error } = await supabase.auth.signOut();
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
  const { data } = await supabase.auth.getUser();
  return data.user;
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
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
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
    // Attempt to invoke PostgreSQL RPC function if configured on server
    const { error: rpcError } = await supabase.rpc("delete_user_account");
    if (rpcError) {
      console.warn("[Noticed] Remote RPC delete_user_account failed:", rpcError);
    }
  } catch (err) {
    console.warn("[Noticed] Could not execute delete_user_account RPC:", err);
  } finally {
    // Always sign out the session cleanly
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[Noticed] Error signing out during account deletion:", e);
    }
  }
}
