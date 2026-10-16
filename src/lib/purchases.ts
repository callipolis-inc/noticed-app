import { Capacitor } from "@capacitor/core";
import { Purchases, PurchasesOffering, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { setProUser, isProUser } from "./proManager";
import { supabase } from "./supabase";

export const RC_ENTITLEMENT_ID = "atelier_pro";

export type AtelierPlanId = "monthly" | "annual" | "lifetime";

interface PurchaseResult {
  success: boolean;
  isPro: boolean;
  message?: string;
}

let isInitialized = false;

async function syncProToSupabase(isPro: boolean, appUserId?: string | null): Promise<void> {
  try {
    const uid = appUserId || (await supabase.auth.getUser()).data.user?.id;
    if (uid) {
      await supabase
        .from("profiles")
        .update({ is_pro: isPro, updated_at: new Date().toISOString() })
        .eq("id", uid);
    }
  } catch (err) {
    console.warn("[Purchases] Failed to sync Pro status to Supabase profiles:", err);
  }
}

/**
 * Resolves the appropriate RevenueCat API key based on runtime platform.
 */
function getRevenueCatApiKey(): string | null {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    return import.meta.env.VITE_REVENUECAT_APPLE_KEY || null;
  }
  if (platform === "android") {
    return import.meta.env.VITE_REVENUECAT_GOOGLE_KEY || null;
  }
  return null;
}

/**
 * Initializes RevenueCat Purchases on native platforms (iOS & Android).
 * Gracefully falls back to mock/dev mode on web or when API keys are not yet provided.
 */
export async function initPurchases(appUserId?: string | null): Promise<void> {
  if (isInitialized) return;

  if (!Capacitor.isNativePlatform()) {
    console.info("[Purchases] Web / Preview mode active. Using local entitlement fallback.");
    return;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn(
      "[Purchases] RevenueCat API key not configured for platform:",
      Capacitor.getPlatform(),
      "— Using local entitlement fallback.",
    );
    return;
  }

  try {
    await Purchases.configure({
      apiKey,
      appUserID: appUserId || undefined,
    });

    isInitialized = true;

    // Listen for customer entitlement updates from RevenueCat
    await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      const isPro = Boolean(customerInfo.entitlements.active[RC_ENTITLEMENT_ID]);
      setProUser(isPro);
      syncProToSupabase(isPro, appUserId);
    });

    // Check initial entitlement status on boot
    const { customerInfo } = await Purchases.getCustomerInfo();
    const hasActivePro = Boolean(customerInfo.entitlements.active[RC_ENTITLEMENT_ID]);
    if (hasActivePro) {
      setProUser(true);
      syncProToSupabase(true, appUserId);
    }
  } catch (err) {
    console.warn("[Purchases] RevenueCat configuration warning (using fallback):", err);
  }
}

/**
 * Fetches current offerings from RevenueCat if native & configured.
 */
export async function getAtelierOfferings(): Promise<PurchasesOffering | null> {
  if (!isInitialized || !Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    console.warn("[Purchases] Could not fetch offerings:", err);
    return null;
  }
}

/**
 * Purchases an Atelier Pro plan through Apple App Store / Google Play via RevenueCat,
 * with seamless simulated fallback in development or web previews.
 */
export async function purchaseAtelierPlan(
  planId: AtelierPlanId,
): Promise<PurchaseResult> {
  if (!isInitialized || !Capacitor.isNativePlatform()) {
    // Development / Web fallback: activate local Pro pass immediately
    await new Promise((resolve) => setTimeout(resolve, 400));
    setProUser(true);
    return {
      success: true,
      isPro: true,
      message: "Atelier Pro aktif (Preview Mode).",
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    if (!current || !current.availablePackages.length) {
      // Fallback if offerings not yet approved/published on store console
      setProUser(true);
      return {
        success: true,
        isPro: true,
        message: "Atelier Pro diaktifkan dalam mode pratinjau.",
      };
    }

    // Match package by identifier or packageType
    let targetPackage: PurchasesPackage | undefined = current.availablePackages.find(
      (pkg) => {
        const id = pkg.identifier.toLowerCase();
        const type = String(pkg.packageType || "").toLowerCase();
        if (planId === "monthly") return id.includes("monthly") || type.includes("monthly");
        if (planId === "annual") return id.includes("annual") || type.includes("annual");
        if (planId === "lifetime") return id.includes("lifetime") || type.includes("lifetime");
        return false;
      },
    );

    // Secondary fallback: select first package if exact match is pending config
    if (!targetPackage) {
      targetPackage = current.availablePackages[0];
    }

    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: targetPackage,
    });

    const isPro = Boolean(customerInfo.entitlements.active[RC_ENTITLEMENT_ID]);
    setProUser(isPro);
    syncProToSupabase(isPro);

    return {
      success: isPro,
      isPro,
      message: isPro
        ? "Selamat datang di Atelier Pro."
        : "Transaksi selesai namun status belum aktif.",
    };
  } catch (err: unknown) {
    const errorObj = err as { userCancelled?: boolean; message?: string; code?: number };
    if (errorObj?.userCancelled || errorObj?.code === 1) {
      return {
        success: false,
        isPro: isProUser(),
        message: "Pembelian dibatalkan.",
      };
    }
    console.error("[Purchases] Purchase failed:", err);
    return {
      success: false,
      isPro: isProUser(),
      message: errorObj?.message || "Gagal memproses transaksi in-app purchase.",
    };
  }
}

/**
 * Restores previous in-app purchases (Mandatory for Apple App Store Review Guideline 3.1.1).
 */
export async function restoreAtelierPurchases(): Promise<PurchaseResult> {
  if (!isInitialized || !Capacitor.isNativePlatform()) {
    const current = isProUser();
    return {
      success: true,
      isPro: current,
      message: current
        ? "Status keanggotaan Atelier Pro aktif."
        : "Tidak ditemukan pembelian sebelumnya pada perangkat ini.",
    };
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const isPro = Boolean(customerInfo.entitlements.active[RC_ENTITLEMENT_ID]);
    setProUser(isPro);
    syncProToSupabase(isPro);

    return {
      success: true,
      isPro,
      message: isPro
        ? "Pembelian berhasil dipulihkan. Atelier Pro aktif."
        : "Tidak ditemukan transaksi aktif pada akun App Store / Google Play ini.",
    };
  } catch (err: unknown) {
    console.error("[Purchases] Restore failed:", err);
    const msg = err instanceof Error ? err.message : "Gagal memulihkan pembelian.";
    return {
      success: false,
      isPro: isProUser(),
      message: msg,
    };
  }
}

/**
 * Links user authentication ID with RevenueCat on sign in.
 */
export async function loginPurchasesUser(userId: string): Promise<void> {
  if (!isInitialized || !Capacitor.isNativePlatform()) return;
  try {
    const { customerInfo } = await Purchases.logIn({ appUserID: userId });
    const isPro = Boolean(customerInfo.entitlements.active[RC_ENTITLEMENT_ID]);
    if (isPro) {
      setProUser(true);
    }
  } catch (err) {
    console.warn("[Purchases] logIn warning:", err);
  }
}

/**
 * Resets user ID with RevenueCat on sign out.
 */
export async function logoutPurchasesUser(): Promise<void> {
  if (!isInitialized || !Capacitor.isNativePlatform()) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn("[Purchases] logOut warning:", err);
  }
}
