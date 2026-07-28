const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Short Spanish relative time, for timestamps shown next to list cards.
 * Returns null when there is no timestamp, so callers can hide the label.
 *
 * Deliberately coarse: "hace 3 d" is enough context, an exact date is noise here.
 */
export function formatRelativeTime(isoDate?: string): string | null {
  if (!isoDate) return null;

  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return null;

  const elapsed = Date.now() - then;

  // Clock skew or a future date: treat as just now rather than "in -2h"
  if (elapsed < MINUTE) return "hace un momento";
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `hace ${minutes} min`;
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `hace ${hours} h`;
  }

  const days = Math.floor(elapsed / DAY);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;

  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} ${months === 1 ? "mes" : "meses"}`;

  const years = Math.floor(days / 365);
  return `hace ${years} ${years === 1 ? "año" : "años"}`;
}
