/**
 * Atelier Pro Infrastructure Manager
 * Manages subscription status, feature gating, and membership persistence.
 * Offline-first, reactive, and easily configurable for future monetization.
 */

import { useState, useEffect } from "react";

const PRO_STORAGE_KEY = "sidenotes_is_pro";
const PRO_EVENT_KEY = "sidenotes_pro_status_changed";

export const FREE_MAX_PHOTOS = 3;

export type ProFeature = "video" | "audio_import" | "unlimited_photos";

/**
 * Checks if the current user has Atelier Pro status.
 * Defaults to true for current owner / sideload device so testing is seamless.
 */
export function isProUser(): boolean {
  try {
    const val = localStorage.getItem(PRO_STORAGE_KEY);
    if (val === null) {
      // Default to Pro for the developer/owner sideload environment
      localStorage.setItem(PRO_STORAGE_KEY, "true");
      return true;
    }
    return val === "true";
  } catch {
    return true;
  }
}

/**
 * Updates the user's Pro status and broadcasts the change across components.
 */
export function setProUser(status: boolean): void {
  try {
    localStorage.setItem(PRO_STORAGE_KEY, status ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent(PRO_EVENT_KEY, { detail: { isPro: status } })
    );
  } catch (err) {
    console.error("Failed to persist Pro status:", err);
  }
}

/**
 * React hook to reactively subscribe to Pro status changes anywhere in the app.
 */
export function useProStatus(): boolean {
  const [pro, setPro] = useState<boolean>(() => isProUser());

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isPro: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isPro === "boolean") {
        setPro(customEvent.detail.isPro);
      } else {
        setPro(isProUser());
      }
    };

    window.addEventListener(PRO_EVENT_KEY, handleStatusChange);
    window.addEventListener("storage", handleStatusChange);
    return () => {
      window.removeEventListener(PRO_EVENT_KEY, handleStatusChange);
      window.removeEventListener("storage", handleStatusChange);
    };
  }, []);

  return pro;
}

/**
 * Determines whether a given action is allowed under the current user's membership.
 */
export function canUseFeature(
  feature: ProFeature,
  currentCount?: number
): boolean {
  const pro = isProUser();
  if (pro) return true;

  switch (feature) {
    case "video":
      return false; // Pro required for motion video clips
    case "audio_import":
      return false; // Pro required for importing external audio files
    case "unlimited_photos":
      return (currentCount ?? 0) < FREE_MAX_PHOTOS;
    default:
      return true;
  }
}
