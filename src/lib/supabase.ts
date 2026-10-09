import { createClient, type User, type Session } from "@supabase/supabase-js";

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
 * Sends a 6-digit OTP code to the provided email address
 */
export async function sendEmailOtp(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Please check your .env file.");
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
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

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: "email",
  });

  if (error) {
    throw error;
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
