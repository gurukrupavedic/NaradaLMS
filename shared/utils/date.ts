/**
 * Date formatting utilities using Intl.DateTimeFormat.
 * Use for locale-aware, consistent date display across the app.
 */

export type FormatDateOptions = Intl.DateTimeFormatOptions;

const defaultOptions: FormatDateOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

/**
 * Format a date for display using Intl.DateTimeFormat.
 * @param date - Date instance, ISO string, or timestamp
 * @param locale - BCP 47 locale (e.g. "en-US"). Defaults to "en-US" if not provided.
 * @param options - Intl.DateTimeFormatOptions (e.g. dateStyle, timeZone)
 * @returns Formatted date string, or "—" if date is invalid/missing
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  locale?: string,
  options?: FormatDateOptions
): string {
  if (date == null) return "—";
  const d = typeof date === "object" && "getTime" in date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const loc = locale ?? "en-US";
  const opts = options ?? defaultOptions;
  return new Intl.DateTimeFormat(loc, opts).format(d);
}
