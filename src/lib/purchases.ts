import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  PurchasesOffering,
  PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { setProUser, isProUser } from "./proManager";
import { supabase } from "./supabase";
import { getSavedAppLanguage } from "./i18n";

export const RC_ENTITLEMENT_ID = "atelier_pro";
export const RC_FALLBACK_ENTITLEMENT_ID = "noticed_notes_on_noticing_pro";

export function checkCustomerHasPro(
  customerInfo?: {
    entitlements?: { active?: Record<string, unknown> };
  } | null,
): boolean {
  if (!customerInfo?.entitlements?.active) return false;
  return Boolean(
    customerInfo.entitlements.active[RC_ENTITLEMENT_ID] ||
      customerInfo.entitlements.active[RC_FALLBACK_ENTITLEMENT_ID],
  );
}

export type AtelierPlanId = "monthly" | "annual" | "lifetime";

export interface SubscriptionDetails {
  planId: AtelierPlanId;
  planName: string;
  isLifetime: boolean;
  expiresAt: string | null; // ISO string date of expiration, null for lifetime
  purchaseDate: string; // ISO string date of purchase
  willRenew: boolean; // Whether subscription auto-renews
  userEmail?: string | null; // Linked account email
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
  userEmail?: string | null,
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

  const prodId = String(
    activeEntitlement?.productIdentifier || "",
  ).toLowerCase();
  let planId: AtelierPlanId = preferredPlanId;

  if (
    hasLifetimeNonSub ||
    prodId.includes("lifetime") ||
    prodId.includes("patron")
  ) {
    planId = "lifetime";
  } else if (prodId.includes("monthly") || prodId.includes("month")) {
    planId = "monthly";
  } else if (prodId.includes("annual") || prodId.includes("year")) {
    planId = "annual";
  } else if (
    preferredPlanId === "monthly" ||
    preferredPlanId === "annual" ||
    preferredPlanId === "lifetime"
  ) {
    planId = preferredPlanId;
  }

  // Only consult stored plan preference when StoreKit productIdentifier is empty
  if (!prodId && !hasLifetimeNonSub && typeof localStorage !== "undefined") {
    const savedPlan = localStorage.getItem(
      "noticed_pro_plan",
    ) as AtelierPlanId | null;
    if (
      savedPlan === "lifetime" ||
      savedPlan === "monthly" ||
      savedPlan === "annual"
    ) {
      planId = savedPlan;
    }
  }

  const isLifetime =
    planId === "lifetime" ||
    hasLifetimeNonSub ||
    !activeEntitlement?.expirationDate;
  // If lifetime, expiresAt MUST be null. Never a date string!
  const expiresAt = isLifetime
    ? null
    : activeEntitlement?.expirationDate || null;
  const willRenew = isLifetime ? false : Boolean(activeEntitlement?.willRenew);
  const purchaseDate =
    activeEntitlement?.latestPurchaseDate || new Date().toISOString();

  const resolvedPlanId: AtelierPlanId = isLifetime ? "lifetime" : planId;
  const planName = isLifetime
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
  userEmail?: string | null,
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

export async function syncProToSupabase(
  isPro: boolean,
  appUserId?: string | null,
): Promise<void> {
  try {
    const uid = appUserId || (await supabase.auth.getUser()).data.user?.id;
    if (uid) {
      await supabase
        .from("profiles")
        .upsert(
          { id: uid, is_pro: isPro, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        );
    }
  } catch (err) {
    console.warn(
      "[Purchases] Failed to sync Pro status to Supabase profiles:",
      err,
    );
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
 * Gracefully falls back to mock/dev mode on web.
 */
export async function initPurchases(appUserId?: string | null): Promise<void> {
  if (isInitialized) return;

  if (!Capacitor.isNativePlatform()) {
    console.info(
      "[Purchases] Web / Preview mode active. Using local entitlement fallback.",
    );
    return;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn(
      "[Purchases] RevenueCat API key not configured for platform:",
      Capacitor.getPlatform(),
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
    console.warn("[Purchases] RevenueCat configuration warning:", err);
  }
}

/**
 * Fetches current offerings from RevenueCat if native & configured.
 */
export async function getAtelierOfferings(): Promise<PurchasesOffering | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  if (!isInitialized) {
    await initPurchases();
  }

  if (!isInitialized) {
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
  const isId = getSavedAppLanguage() === "id";
  if (!rawMessage) {
    return isId
      ? "Gagal memproses transaksi App Store. Silakan coba lagi."
      : "Could not process the App Store transaction. Please try again.";
  }
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("configuration") ||
    lower.includes("none of the products") ||
    lower.includes("rev.cat") ||
    lower.includes("empty") ||
    lower.includes("storekit") ||
    lower.includes("could not be fetched")
  ) {
    return isId
      ? "Katalog App Store sedang disinkronkan oleh server Apple. Silakan coba beberapa saat lagi."
      : "The App Store catalog is currently syncing with Apple servers. Please try again shortly.";
  }
  return rawMessage;
}

/**
 * Purchases an Atelier Pro plan through Apple App Store / Google Play via RevenueCat.
 * Simulated preview mode is strictly restricted to non-native web browsers.
 */
export async function purchaseAtelierPlan(
  planId: AtelierPlanId,
  userEmail?: string | null,
): Promise<PurchaseResult> {
  const isId = getSavedAppLanguage() === "id";

  // Web browser preview fallback ONLY (never on native iOS/Android devices)
  if (!Capacitor.isNativePlatform()) {
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
      message: isId
        ? "Atelier Pro aktif (Mode Pratinjau Web)."
        : "Atelier Pro active (Web Preview Mode).",
      details,
    };
  }

  // On Native iOS/Android: attempt lazy initialization if not yet initialized
  if (!isInitialized) {
    await initPurchases();
  }

  if (!isInitialized) {
    return {
      success: false,
      isPro: isProUser(),
      message: isId
        ? "Layanan pembayaran App Store belum siap. Periksa koneksi internet Anda dan coba lagi."
        : "App Store billing service is not ready yet. Please check your connection and try again.",
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    if (!current || !current.availablePackages.length) {
      return {
        success: false,
        isPro: isProUser(),
        message: isId
          ? "Paket langganan sedang dipersiapkan oleh App Store. Silakan coba sesaat lagi."
          : "Subscription packages are being prepared by the App Store. Please try again shortly.",
      };
    }

    // Match package by identifier or packageType
    const targetPackage: PurchasesPackage | undefined =
      current.availablePackages.find((pkg) => {
        const id = pkg.identifier.toLowerCase();
        const type = String(pkg.packageType || "").toLowerCase();
        if (planId === "monthly")
          return id.includes("monthly") || type.includes("monthly");
        if (planId === "annual")
          return id.includes("annual") || type.includes("annual");
        if (planId === "lifetime")
          return id.includes("lifetime") || type.includes("lifetime");
        return false;
      });

    if (!targetPackage) {
      return {
        success: false,
        isPro: isProUser(),
        message: isId
          ? "Paket yang dipilih belum tersedia di katalog App Store saat ini. Silakan coba sesaat lagi."
          : "The selected plan is not currently available in the App Store catalog. Please try again shortly.",
      };
    }

    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: targetPackage,
    });

    const isPro = checkCustomerHasPro(customerInfo);
    setProUser(isPro);
    await syncProToSupabase(isPro);

    const details = isPro
      ? buildSubscriptionDetailsFromCustomerInfo(
          customerInfo,
          planId,
          userEmail,
        )
      : undefined;

    return {
      success: isPro,
      isPro,
      message: isPro
        ? isId
          ? "Selamat datang di Atelier Pro."
          : "Welcome to Atelier Pro."
        : isId
          ? "Transaksi selesai namun status belum aktif."
          : "Transaction completed, awaiting entitlement activation.",
      details,
    };
  } catch (err: unknown) {
    const errorObj = err as {
      userCancelled?: boolean;
      message?: string;
      code?: number;
    };
    if (errorObj?.userCancelled || errorObj?.code === 1) {
      return {
        success: false,
        isPro: isProUser(),
        message: isId ? "Pembelian dibatalkan." : "Purchase cancelled.",
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
  const isId = getSavedAppLanguage() === "id";
  const savedPlan = (
    typeof localStorage !== "undefined"
      ? localStorage.getItem("noticed_pro_plan")
      : null
  ) as AtelierPlanId | null;
  const preferredPlanId: AtelierPlanId = savedPlan || "lifetime";

  if (!Capacitor.isNativePlatform()) {
    const current = isProUser();
    const details = current
      ? buildSimulatedSubscriptionDetails(preferredPlanId, userEmail)
      : undefined;
    return {
      success: true,
      isPro: current,
      message: current
        ? isId
          ? "Status keanggotaan Atelier Pro aktif."
          : "Atelier Pro membership is active."
        : isId
          ? "Tidak ditemukan pembelian sebelumnya pada akun perangkat ini."
          : "No previous purchases were found on this device account.",
      details,
    };
  }

  if (!isInitialized) {
    await initPurchases();
  }

  if (!isInitialized) {
    return {
      success: false,
      isPro: isProUser(),
      message: isId
        ? "Gagal menghubungi App Store untuk memulihkan pembelian. Periksa koneksi Anda."
        : "Could not connect to the App Store to restore purchases. Please check your connection.",
    };
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const isPro = checkCustomerHasPro(customerInfo);
    setProUser(isPro);
    await syncProToSupabase(isPro);

    const details = isPro
      ? buildSubscriptionDetailsFromCustomerInfo(
          customerInfo,
          preferredPlanId,
          userEmail,
        )
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
        ? isId
          ? "Pembelian berhasil dipulihkan. Atelier Pro aktif."
          : "Purchases restored. Atelier Pro is now active."
        : isId
          ? "Tidak ditemukan transaksi aktif pada akun App Store ini. Pastikan Anda masuk dengan Apple ID yang sama saat pembelian pertama."
          : "No active transactions found on this App Store account. Please ensure you are signed in with the same Apple ID used for your original purchase.",
      details,
    };
  } catch (err: unknown) {
    console.error("[Purchases] Restore failed:", err);
    const msg =
      err instanceof Error
        ? err.message
        : isId
          ? "Gagal memulihkan pembelian."
          : "Failed to restore purchases.";
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

  const savedPlan = (
    typeof localStorage !== "undefined"
      ? localStorage.getItem("noticed_pro_plan")
      : null
  ) as AtelierPlanId | null;
  const preferredPlanId: AtelierPlanId = savedPlan || "lifetime";

  if (isInitialized && Capacitor.isNativePlatform()) {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      if (checkCustomerHasPro(customerInfo)) {
        return buildSubscriptionDetailsFromCustomerInfo(
          customerInfo,
          preferredPlanId,
          userEmail,
        );
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
    window.open(
      "https://play.google.com/store/account/subscriptions",
      "_blank",
    );
    return;
  }
  window.open("https://apps.apple.com/account/subscriptions", "_blank");
}

/**
 * Links user authentication ID with RevenueCat on sign in.
 */
export async function loginPurchasesUser(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!isInitialized) {
    await initPurchases(userId);
  }
  if (!isInitialized) return;
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
  if (!Capacitor.isNativePlatform()) {
    return isProUser();
  }
  if (!isInitialized) {
    await initPurchases();
  }
  if (!isInitialized) {
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
