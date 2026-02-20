export type FormatDateOptions = Intl.DateTimeFormatOptions;

const defaultOptions: FormatDateOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

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
