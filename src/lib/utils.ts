import clsx, { type ClassValue } from "clsx";
import { AppLanguage, getSavedAppLanguage } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function formatNoteDate(
  dateStr: string | Date,
  lang?: AppLanguage,
): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";

  const currentLang = lang || getSavedAppLanguage();
  const locale = currentLang === "id" ? "id-ID" : "en-GB";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatTimeOnly(
  dateStr: string | Date,
  lang?: AppLanguage,
): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";

  const currentLang = lang || getSavedAppLanguage();
  if (currentLang === "id") {
    // Indonesian format: 24h dot notation (e.g. 14.30)
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d).replace(":", ".");
  }

  // English format: 12h AM/PM
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d).toUpperCase();
}

export function getDateGroupKey(
  dateStr: string | Date,
  lang?: AppLanguage,
): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";

  const currentLang = lang || getSavedAppLanguage();
  const locale = currentLang === "id" ? "id-ID" : "en-GB";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatNoteRelativeDate(
  dateStr: string | Date,
  lang?: AppLanguage,
): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "";

  const currentLang = lang || getSavedAppLanguage();
  const now = new Date();
  const time = formatTimeOnly(d, currentLang);

  const todayLabel = currentLang === "id" ? "Hari ini" : "Today";
  const yesterdayLabel = currentLang === "id" ? "Kemarin" : "Yesterday";

  if (d.toDateString() === now.toDateString()) {
    return `${todayLabel} · ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `${yesterdayLabel} · ${time}`;
  }

  const monthDay = new Intl.DateTimeFormat(
    currentLang === "id" ? "id-ID" : "en-US",
    {
      month: "short",
      day: "numeric",
    },
  ).format(d);

  return `${monthDay} · ${time}`;
}
