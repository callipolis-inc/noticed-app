import { Haptics, ImpactStyle } from "@capacitor/haptics";

let cachedHapticsEnabled: boolean | null = null;

export function isHapticsEnabled(): boolean {
  if (cachedHapticsEnabled !== null) return cachedHapticsEnabled;
  if (typeof window === "undefined") return false;
  try {
    cachedHapticsEnabled =
      localStorage.getItem("sidenotes_haptics_enabled") !== "false";
  } catch {
    cachedHapticsEnabled = true;
  }
  return cachedHapticsEnabled;
}

export function setHapticsEnabled(enabled: boolean): void {
  cachedHapticsEnabled = enabled;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        "sidenotes_haptics_enabled",
        enabled ? "true" : "false",
      );
    } catch {}
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "sidenotes_haptics_enabled" && e.newValue !== null) {
      cachedHapticsEnabled = e.newValue !== "false";
    }
  });
}

export const triggerHaptic = async (
  style: "light" | "medium" | "heavy" = "light",
) => {
  if (!isHapticsEnabled()) return;
  try {
    const impactStyle =
      style === "heavy"
        ? ImpactStyle.Heavy
        : style === "medium"
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
    await Haptics.impact({ style: impactStyle });
  } catch {
    // Web fallback if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(style === "heavy" ? 25 : style === "medium" ? 15 : 8);
    }
  }
};

export const triggerSuccessHaptic = async () => {
  if (!isHapticsEnabled()) return;
  try {
    await Haptics.notification({ type: "success" as any });
  } catch {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([10, 30, 15]);
    }
  }
};

