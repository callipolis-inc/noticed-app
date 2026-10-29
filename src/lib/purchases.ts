import { Capacitor } from "@capacitor/core";
import { Purchases, PurchasesOffering, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { setProUser, isProUser } from "./proManager";
import { supabase } from "./supabase";

export const RC_ENTITLEMENT_ID = "atelier_pro";
export const RC_FALLBACK_ENTITLEMENT_ID = "noticed_notes_on_noticing_pro";

export function checkCustomerHasPro(customerInfo?: {
  entitlements?: { active?: Record<string, unknown> };
} | null): boolean {
  if (!customerInfo?.entitlements?.active) return false;
  return Boolean(
    customerInfo.entitlements.active[RC_ENTITLEMENT_ID] ||
    customerInfo.entitlements.active[RC_FALLBACK_ENTITLEMENT_ID]
  );
}

export type AtelierPlanId = "monthly" | "annual" | "lifetime";

export interface SubscriptionDetails {
  planId: AtelierPlanId;
  planName: string;
  isLifetime: boolean;
  expiresAt: string | null;      // ISO string date of expiration, null for lifetime
  purchaseDate: string;          // ISO string date of purchase
  willRenew: boolean;            // Whether subscription auto-renews
  userEmail?: string | null;     // Linked account email
  store: "apple" | "google" | "web";
}

export interface PurchaseResult {
  success: boolean;
  isPro: boolean;
  message?: string;
  details?: SubscriptionDetails;
}

let isInitialized = false;

function buildSubscriptionDetailsFromCustomerInfo(
  customerInfo: any,
  preferredPlanId: AtelierPlanId = "lifetime",
  userEmail?: string | null
): SubscriptionDetails {
  const activeEntitlement =
    customerInfo?.entitlements?.active?.[RC_ENTITLEMENT_ID] ||
    customerInfo?.entitlements?.active?.[RC_FALLBACK_ENTITLEMENT_ID];

  // Inspect non-subscription transactions (Standard representation of Lifetime in StoreKit/RevenueCat)
  const nonSubTransactions = customerInfo?.nonSubscriptionTransactions || [];
  const hasLifetimeNonSub = nonSubTransactions.some((tx: any) => {
    const id = String(tx?.productIdentifier || "").toLowerCase();
    return id.includes("lifetime") || id.includes("patron");
  });

  const prodId = String(activeEntitlement?.productIdentifier || "").toLowerCase();
  let planId: AtelierPlanId = preferredPlanId;

  if (hasLifetimeNonSub || prodId.includes("lifetime") || prodId.includes("patron")) {
    planId = "lifetime";
  } else if (prodId.includes("monthly") || prodId.includes("month")) {
    planId = "monthly";
  } else if (prodId.includes("annual") || prodId.includes("year")) {
    planId = "annual";
  } else if (preferredPlanId === "monthly" || preferredPlanId === "annual" || preferredPlanId === "lifetime") {
    planId = preferredPlanId;
  }

  // Only consult stored plan preference when StoreKit productIdentifier is empty
  if (!prodId && !hasLifetimeNonSub && typeof localStorage !== "undefined") {
    const savedPlan = localStorage.getItem("noticed_pro_plan") as AtelierPlanId | null;
    if (savedPlan === "lifetime" || savedPlan === "monthly" || savedPlan === "annual") {
      planId = savedPlan;
    }
  }

  const isLifetime = planId === "lifetime" || hasLifetimeNonSub || !activeEntitlement?.expirationDate;
  // If lifetime, expiresAt MUST be null. Never a date string!
  const expiresAt = isLifetime ? null : activeEntitlement?.expirationDate || null;
  const willRenew = isLifetime ? false : Boolean(activeEntitlement?.willRenew);
  const purchaseDate = activeEntitlement?.latestPurchaseDate || new Date().toISOString();

  const resolvedPlanId: AtelierPlanId = isLifetime ? "lifetime" : planId;
  const planName =
    isLifetime
      ? "Patron (Lifetime)"
      : resolvedPlanId === "monthly"
      ? "Monthly Edition"
      : "Annual Folio";

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("noticed_pro_plan", resolvedPlanId);
    } catch {}
  }

  return {
    planId: resolvedPlanId,
    planName,
    isLifetime,
    expiresAt,
    purchaseDate,
    willRenew,
    userEmail: userEmail || undefined,
    store: Capacitor.getPlatform() === "ios" ? "apple" : "google",
  };
}

function buildSimulatedSubscriptionDetails(
  planId: AtelierPlanId = "annual",
  userEmail?: string | null
): SubscriptionDetails {
  const now = new Date();
  let expiresAt: string | null = null;
  if (planId === "monthly") {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    expiresAt = d.toISOString();
  } else if (planId === "annual") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() + 1);
    expiresAt = d.toISOString();
  }

  const planName =
    planId === "monthly"
      ? "Monthly Edition"
      : planId === "annual"
      ? "Annual Folio"
      : "Patron (Lifetime)";

  return {
    planId,
    planName,
    isLifetime: planId === "lifetime",
    expiresAt,
    purchaseDate: now.toISOString(),
    willRenew: planId !== "lifetime",
    userEmail: userEmail || undefined,
    store: Capacitor.getPlatform() === "ios" ? "apple" : "web",
  };
}

export async function syncProToSupabase(isPro: boolean, appUserId?: string | null): Promise<void> {
  try {
    const uid = appUserId || (await supabase.auth.getUser()).data.user?.id;
    if (uid) {
      await supabase
        .from("profiles")
        .upsert(
          { id: uid, is_pro: isPro, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
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
      const isPro = checkCustomerHasPro(customerInfo);
      setProUser(isPro);
      void syncProToSupabase(isPro, appUserId);
    });

    // Check initial entitlement status on boot
    const { customerInfo } = await Purchases.getCustomerInfo();
    const hasActivePro = checkCustomerHasPro(customerInfo);
    setProUser(hasActivePro);
    if (appUserId) {
      await syncProToSupabase(hasActivePro, appUserId);
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

function sanitizePurchaseErrorMessage(rawMessage?: string): string {
  if (!rawMessage) return "Gagal memproses transaksi in-app purchase. Silakan coba lagi.";
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("configuration") ||
    lower.includes("none of the products") ||
    lower.includes("rev.cat") ||
    lower.includes("empty") ||
    lower.includes("storekit") ||
    lower.includes("could not be fetched")
  ) {
    return "Katalog App Store sedang disinkronkan oleh server Apple. Silakan coba beberapa saat lagi.";
  }
  return rawMessage;
}

/**
 * Purchases an Atelier Pro plan through Apple App Store / Google Play via RevenueCat,
 * with seamless simulated fallback in development or web previews.
 */
export async function purchaseAtelierPlan(
  planId: AtelierPlanId,
  userEmail?: string | null,
): Promise<PurchaseResult> {
  if (!isInitialized || !Capacitor.isNativePlatform()) {
    // Development / Web fallback: activate local Pro pass immediately
    await new Promise((resolve) => setTimeout(resolve, 400));
    setProUser(true);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("noticed_pro_plan", planId);
      } catch {}
    }
    await syncProToSupabase(true);
    const details = buildSimulatedSubscriptionDetails(planId, userEmail);
    return {
      success: true,
      isPro: true,
      message: "Atelier Pro aktif (Preview Mode).",
      details,
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    if (!current || !current.availablePackages.length) {
      return {
        success: false,
        isPro: false,
        message: "Paket langganan sedang dipersiapkan oleh App Store. Silakan coba sesaat lagi.",
      };
    }

    // Match package by identifier or packageType
    const targetPackage: PurchasesPackage | undefined = current.availablePackages.find(
      (pkg) => {
        const id = pkg.identifier.toLowerCase();
        const type = String(pkg.packageType || "").toLowerCase();
        if (planId === "monthly") return id.includes("monthly") || type.includes("monthly");
        if (planId === "annual") return id.includes("annual") || type.includes("annual");
        if (planId === "lifetime") return id.includes("lifetime") || type.includes("lifetime");
        return false;
      },
    );

    if (!targetPackage) {
      return {
        success: false,
        isPro: isProUser(),
        message: "Paket yang dipilih belum tersedia di katalog App Store saat ini. Silakan coba sesaat lagi.",
      };
    }

    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: targetPackage,
    });

    const isPro = checkCustomerHasPro(customerInfo);
    setProUser(isPro);
    await syncProToSupabase(isPro);

    const details = isPro
      ? buildSubscriptionDetailsFromCustomerInfo(customerInfo, planId, userEmail)
      : undefined;

    return {
      success: isPro,
      isPro,
      message: isPro
        ? "Selamat datang di Atelier Pro."
        : "Transaksi selesai namun status belum aktif.",
      details,
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
    console.warn("[Purchases] Purchase notice:", err);
    return {
      success: false,
      isPro: isProUser(),
      message: sanitizePurchaseErrorMessage(errorObj?.message),
    };
  }
}

/**
 * Restores previous in-app purchases (Mandatory for Apple App Store Review Guideline 3.1.1).
 */
export async function restoreAtelierPurchases(
  userEmail?: string | null,
): Promise<PurchaseResult> {
  const savedPlan = (typeof localStorage !== "undefined"
    ? localStorage.getItem("noticed_pro_plan")
    : null) as AtelierPlanId | null;
  const preferredPlanId: AtelierPlanId = savedPlan || "lifetime";

  if (!isInitialized || !Capacitor.isNativePlatform()) {
    const current = isProUser();
    const details = current
      ? buildSimulatedSubscriptionDetails(preferredPlanId, userEmail)
      : undefined;
    return {
      success: true,
      isPro: current,
      message: current
        ? "Status keanggotaan Atelier Pro aktif."
        : "Tidak ditemukan pembelian sebelumnya pada akun perangkat ini.",
      details,
    };
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const isPro = checkCustomerHasPro(customerInfo);
    setProUser(isPro);
    await syncProToSupabase(isPro);

    const details = isPro
      ? buildSubscriptionDetailsFromCustomerInfo(customerInfo, preferredPlanId, userEmail)
      : undefined;

    if (details?.planId && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("noticed_pro_plan", details.planId);
      } catch {}
    }

    return {
      success: true,
      isPro,
      message: isPro
        ? "Pembelian berhasil dipulihkan. Atelier Pro aktif."
        : "Tidak ditemukan transaksi aktif pada akun store ini. Pastikan Anda masuk dengan akun yang sama saat pembelian pertama.",
      details,
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
 * Retrieves current active subscription details from RevenueCat or local fallback.
 */
export async function getActiveSubscriptionDetails(
  userEmail?: string | null,
): Promise<SubscriptionDetails | null> {
  if (!isProUser()) return null;

  const savedPlan = (typeof localStorage !== "undefined"
    ? localStorage.getItem("noticed_pro_plan")
    : null) as AtelierPlanId | null;
  const preferredPlanId: AtelierPlanId = savedPlan || "lifetime";

  if (isInitialized && Capacitor.isNativePlatform()) {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      if (checkCustomerHasPro(customerInfo)) {
        return buildSubscriptionDetailsFromCustomerInfo(customerInfo, preferredPlanId, userEmail);
      }
    } catch (err) {
      console.warn("[Purchases] getActiveSubscriptionDetails warning:", err);
    }
  }

  // Fallback for verified Pro user
  return buildSimulatedSubscriptionDetails(preferredPlanId, userEmail);
}

/**
 * Opens the native store subscription management interface.
 * - iOS: Opens native Apple ID Subscriptions sheet via itms-apps scheme
 * - Android: Opens Google Play subscriptions page
 * - Web: Opens Apple support page
 */
export function openStoreSubscriptionManagement(): void {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    // Official Apple StoreKit subscription management deep link
    window.location.href = "itms-apps://apps.apple.com/account/subscriptions";
    setTimeout(() => {
      window.open("https://apps.apple.com/account/subscriptions", "_blank");
    }, 400);
    return;
  }
  if (platform === "android") {
    window.open("https://play.google.com/store/account/subscriptions", "_blank");
    return;
  }
  window.open("https://apps.apple.com/account/subscriptions", "_blank");
}

/**
 * Links user authentication ID with RevenueCat on sign in.
 */
export async function loginPurchasesUser(userId: string): Promise<void> {
  if (!isInitialized || !Capacitor.isNativePlatform()) return;
  try {
    const { customerInfo } = await Purchases.logIn({ appUserID: userId });
    const isPro = checkCustomerHasPro(customerInfo);
    setProUser(isPro);
    await syncProToSupabase(isPro, userId);
  } catch (err) {
    console.warn("[Purchases] logIn warning:", err);
  }
}

/**
 * Checks native StoreKit / Google Play customer status on demand.
 */
export async function getNativeCustomerProStatus(): Promise<boolean> {
  if (!isInitialized || !Capacitor.isNativePlatform()) {
    return isProUser();
  }
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const isPro = checkCustomerHasPro(customerInfo);
    setProUser(isPro);
    return isPro;
  } catch {
    return isProUser();
  }
}

/**
 * Resets user ID with RevenueCat on sign out.
 */
export async function logoutPurchasesUser(): Promise<void> {
  setProUser(false);
  if (!isInitialized || !Capacitor.isNativePlatform()) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn("[Purchases] logOut warning:", err);
  }
}
