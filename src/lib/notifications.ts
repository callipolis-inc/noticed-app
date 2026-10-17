import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { AppLanguage, getTranslation } from "./i18n";

export interface HabitNotificationSettings {
  morningEnabled: boolean;
  morningTime: string; // "HH:MM" e.g. "08:00"
  eveningEnabled: boolean;
  eveningTime: string; // "HH:MM" e.g. "20:30"
}

export const DEFAULT_HABIT_SETTINGS: HabitNotificationSettings = {
  morningEnabled: false,
  morningTime: "08:00",
  eveningEnabled: false,
  eveningTime: "20:30",
};

const STORAGE_KEY = "noticed_habit_notification_settings";
export const NOTIFICATION_ID_MORNING = 1001;
export const NOTIFICATION_ID_EVENING = 1002;
export const NOTIFICATION_CHANNEL_ID = "noticed-habits";

export interface HabitPrompt {
  title: string;
  content: string;
}

// Curated peaceful and minimalist habit prompts
export const CALM_PROMPTS: Record<
  AppLanguage,
  {
    morning: HabitPrompt[];
    evening: HabitPrompt[];
  }
> = {
  id: {
    morning: [
      {
        title: "Niat Hari Ini",
        content: "Apa satu hal bermakna yang ingin kamu perhatikan hari ini?",
      },
      {
        title: "Intensi Pagi",
        content: "Hadir sejenak. Apa yang paling membutuhkan perhatian tulusmu hari ini?",
      },
      {
        title: "Permulaan Hening",
        content: "Catat suasana pagi ini sebelum ritme kesibukan dimulai.",
      },
    ],
    evening: [
      {
        title: "Refleksi Hening",
        content: "Apa momen kecil atau rasa syukur yang hadir sepanjang hari ini?",
      },
      {
        title: "Endapan Hari",
        content: "Luangkan sejenak untuk mengendapkan pikiran dan apa yang kamu pelajari hari ini.",
      },
      {
        title: "Catatan Malam",
        content: "Hal apa yang membuatmu tersenyum atau merasa hangat hari ini?",
      },
    ],
  },
  en: {
    morning: [
      {
        title: "Today's Intention",
        content: "What is one meaningful thing you wish to notice today?",
      },
      {
        title: "Morning Presence",
        content: "Pause for a moment. What deserves your quiet attention today?",
      },
      {
        title: "Morning Light",
        content: "Capture the atmosphere of this morning before the busy day begins.",
      },
    ],
    evening: [
      {
        title: "Evening Reflection",
        content: "What small moment or quiet gratitude was present today?",
      },
      {
        title: "Distillation of the Day",
        content: "Take a quiet breath and distill the most memorable thought from today.",
      },
      {
        title: "Nightfall Marginalia",
        content: "What brought a sense of warmth or calm to your heart today?",
      },
    ],
  },
};

export function getCuratedPrompt(
  type: "morning" | "evening",
  lang: AppLanguage = "id",
): HabitPrompt {
  const prompts = CALM_PROMPTS[lang]?.[type] || CALM_PROMPTS.id[type];
  const dayIndex = new Date().getDate() % prompts.length;
  return prompts[dayIndex];
}

/**
 * Retrieve saved habit notification settings from local storage.
 */
export function getSavedHabitSettings(): HabitNotificationSettings {
  if (typeof window === "undefined") return DEFAULT_HABIT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HABIT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      morningEnabled: Boolean(parsed.morningEnabled),
      morningTime: typeof parsed.morningTime === "string" ? parsed.morningTime : "08:00",
      eveningEnabled: Boolean(parsed.eveningEnabled),
      eveningTime: typeof parsed.eveningTime === "string" ? parsed.eveningTime : "20:30",
    };
  } catch {
    return DEFAULT_HABIT_SETTINGS;
  }
}

/**
 * Save habit notification settings to local storage.
 */
export function saveHabitSettings(settings: HabitNotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Graceful fallback if storage is restricted
  }
}

/**
 * Check whether local notifications are supported in the current environment.
 */
export function isLocalNotificationsAvailable(): boolean {
  return Capacitor.isNativePlatform() || "Notification" in window;
}

/**
 * Check permission status for notifications.
 */
export async function checkNotificationPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") return "granted";
      if (Notification.permission === "denied") return "denied";
      return "prompt";
    }
    return "granted";
  }

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === "granted") return "granted";
    if (perm.display === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
}

/**
 * Request permission for notifications. Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await Notification.requestPermission();
        return res === "granted";
      } catch {
        return false;
      }
    }
    return true;
  }

  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === "granted";
  } catch {
    return false;
  }
}

function parseHourMinute(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(":");
  const hour = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 0));
  const minute = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
  return { hour, minute };
}

/**
 * Synchronize local scheduled notifications according to current preferences.
 */
export async function syncHabitNotifications(
  settings: HabitNotificationSettings,
  lang: AppLanguage = "id",
): Promise<void> {
  saveHabitSettings(settings);

  if (!Capacitor.isNativePlatform()) {
    // Non-native web fallback: settings persisted in localStorage
    return;
  }

  try {
    // Ensure channel exists on Android 8.0+
    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: "Habit & Reflection Prompts",
        description: "Quiet daily prompts to nurture your writing habit",
        importance: 3,
        visibility: 1,
        vibration: true,
      });
    }

    // Cancel existing scheduled notifications
    await LocalNotifications.cancel({
      notifications: [
        { id: NOTIFICATION_ID_MORNING },
        { id: NOTIFICATION_ID_EVENING },
      ],
    });

    const notificationsToSchedule = [];
    const t = getTranslation(lang);

    // 1. Morning Prompt
    if (settings.morningEnabled) {
      const { hour, minute } = parseHourMinute(settings.morningTime);
      const prompt = getCuratedPrompt("morning", lang);

      notificationsToSchedule.push({
        id: NOTIFICATION_ID_MORNING,
        title: prompt.title || t.reminders.morningDefaultTitle,
        body: prompt.content || t.reminders.morningDefaultBody,
        channelId: NOTIFICATION_CHANNEL_ID,
        schedule: {
          on: { hour, minute },
          allowWhileIdle: true,
        },
        extra: {
          promptType: "morning",
          promptTitle: prompt.title,
          promptContent: prompt.content,
        },
      });
    }

    // 2. Evening Prompt
    if (settings.eveningEnabled) {
      const { hour, minute } = parseHourMinute(settings.eveningTime);
      const prompt = getCuratedPrompt("evening", lang);

      notificationsToSchedule.push({
        id: NOTIFICATION_ID_EVENING,
        title: prompt.title || t.reminders.eveningDefaultTitle,
        body: prompt.content || t.reminders.eveningDefaultBody,
        channelId: NOTIFICATION_CHANNEL_ID,
        schedule: {
          on: { hour, minute },
          allowWhileIdle: true,
        },
        extra: {
          promptType: "evening",
          promptTitle: prompt.title,
          promptContent: prompt.content,
        },
      });
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
    }
  } catch (err) {
    console.warn("[Notifications] Failed to schedule local notifications:", err);
  }
}

/**
 * Register notification tap listener to trigger compose modal with habit prompt.
 */
export function registerNotificationTapListener(
  onTriggerPrompt: (prompt: HabitPrompt) => void,
): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let cleanupFn = () => {};

  LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    try {
      const extra = action.notification.extra;
      if (extra && (extra.promptTitle || extra.promptContent)) {
        onTriggerPrompt({
          title: extra.promptTitle || action.notification.title || "",
          content: extra.promptContent || action.notification.body || "",
        });
      } else if (action.notification.title || action.notification.body) {
        onTriggerPrompt({
          title: action.notification.title || "",
          content: action.notification.body || "",
        });
      }
    } catch (err) {
      console.warn("[Notifications] Error handling notification action:", err);
    }
  }).then((handle) => {
    cleanupFn = () => {
      handle.remove();
    };
  });

  return () => {
    cleanupFn();
  };
}
