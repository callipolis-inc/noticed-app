/**
 * Time-of-day greeting utilities adapting dynamically to the user's local timezone.
 */

export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 4 && hour < 12) {
    return "Good Morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  }
  if (hour >= 17 && hour < 22) {
    return "Good Evening";
  }
  return "Good Evening";
}

export function getUserGreeting(userName?: string, date = new Date()): string {
  const greeting = getTimeGreeting(date);
  const name = userName?.trim() || "Author";
  return `${greeting}, ${name}`;
}
