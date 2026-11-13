const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** Arifa works from Dubai. Times show in the browser's own time zone. */
const LOCALE = "en-AE";

const countFormat = new Intl.NumberFormat(LOCALE);

/** Money arrives as a decimal string ("12500.00"); it is only turned into a number for display. */
export function formatMoney(amount: string | number, currency = "AED"): string {
  try {
    return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    // An unknown currency code must not break the page.
    return `${currency} ${countFormat.format(Number(amount))}`;
  }
}

export const formatCount = (count: string | number) => countFormat.format(Number(count));

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export const formatHour = (ms: number) => new Date(ms).toLocaleTimeString(LOCALE, { hour: "numeric" });

export function formatToday(ms: number): string {
  const date = new Date(ms);
  return `${date.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" })} · ${date.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" })}`;
}

/** "in 2h", "3d ago", "now", relative to `now`. */
export function formatRelative(iso: string, now: number): string {
  const difference = new Date(iso).getTime() - now;
  const distance = Math.abs(difference);
  if (distance < MS_PER_MINUTE) return "now";
  const amount =
    distance < MS_PER_HOUR
      ? `${Math.round(distance / MS_PER_MINUTE)}m`
      : distance < MS_PER_DAY
        ? `${Math.round(distance / MS_PER_HOUR)}h`
        : `${Math.round(distance / MS_PER_DAY)}d`;
  return difference > 0 ? `in ${amount}` : `${amount} ago`;
}

/** "pending_approval" → "Pending approval", for backend codes shown as text. */
export function humanize(code: string): string {
  const words = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const CHANNEL_LABEL: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", phone: "Phone", web: "Website" };

/** A channel code as people write it ("whatsapp" → "WhatsApp"). */
export const channelLabel = (channel: string) => CHANNEL_LABEL[channel] ?? humanize(channel);
