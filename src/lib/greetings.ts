import { AppLanguage, getSavedAppLanguage } from "./i18n";

/**
 * Time-of-day greeting utilities adapting dynamically to the user's local timezone and language.
 */

export function getTimeGreeting(date = new Date(), lang?: AppLanguage): string {
  const currentLang = lang || getSavedAppLanguage();
  const hour = date.getHours();

  if (currentLang === "id") {
    if (hour >= 4 && hour < 11) {
      return "Selamat Pagi";
    }
    if (hour >= 11 && hour < 15) {
      return "Selamat Siang";
    }
    if (hour >= 15 && hour < 19) {
      return "Selamat Sore";
    }
    return "Selamat Malam";
  }

  // English fallback
  if (hour >= 4 && hour < 12) {
    return "Good Morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

export function getUserGreeting(
  userName?: string,
  date = new Date(),
  lang?: AppLanguage,
): string {
  const currentLang = lang || getSavedAppLanguage();
  const greeting = getTimeGreeting(date, currentLang);
  const fallbackName = currentLang === "id" ? "Penulis" : "Author";
  const name = userName?.trim() || fallbackName;
  return `${greeting}, ${name}`;
}
