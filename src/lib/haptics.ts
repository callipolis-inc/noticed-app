import { Haptics, ImpactStyle } from "@capacitor/haptics";

function isHapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("sidenotes_haptics_enabled") !== "false";
  } catch {
    return true;
  }
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

