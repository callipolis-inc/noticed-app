/**
 * Atelier Pro Infrastructure Manager
 * Manages subscription status, feature gating, and membership persistence.
 * Offline-first, reactive, and easily configurable for future monetization.
 */

import { useState, useEffect } from "react";

const PRO_STORAGE_KEY = "sidenotes_is_pro";
const PRO_EVENT_KEY = "sidenotes_pro_status_changed";

export const FREE_MAX_PHOTOS = 3;
export const FREE_MAX_SPACES = 3;
export const FREE_MAX_NOTES_PER_SPACE = 100;
export const FREE_MAX_AUDIO_DURATION = 60; // 60s for Free, 180s for Pro

export type ProFeature =
  | "video"
  | "audio_import"
  | "unlimited_photos"
  | "spaces_limit"
  | "notes_limit"
  | "manuscript_export"
  | "luxury_foil";

/**
 * Checks if the current user has Atelier Pro status.
 */
export function isProUser(): boolean {
  try {
    const val = localStorage.getItem(PRO_STORAGE_KEY);
    if (val === null) {
      return false;
    }
    return val === "true";
  } catch {
    return false;
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
    case "spaces_limit":
      return (currentCount ?? 0) < FREE_MAX_SPACES;
    case "notes_limit":
      return (currentCount ?? 0) < FREE_MAX_NOTES_PER_SPACE;
    case "manuscript_export":
      return false; // Pro required for full manuscript export
    case "luxury_foil":
      return false; // Pro required for custom luxury foil
    default:
      return true;
  }
}
