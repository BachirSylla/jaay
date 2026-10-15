const NBSP = " ";
const TIME_ZONE = "Africa/Dakar";
const LOCALE = "fr-FR";

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

function assertInteger(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${what} must be a safe integer, received ${value}`);
  }
}

/** Formats an integer with French digit grouping, using a no-break space as separator. */
export function formatInteger(value: number): string {
  assertInteger(value, "Value");
  return integerFormat.format(value).replace(/[  \s]/g, NBSP);
}

/** Amount (integer FCFA) split into its number and currency parts, for custom rendering. */
export function formatMoneyParts(amount: number): { value: string; currency: string } {
  assertInteger(amount, "Amount");
  return { value: formatInteger(amount), currency: "F" };
}

/** formatMoney(12500) → "12 500 F" (no-break spaces). Amounts are integer FCFA. */
export function formatMoney(amount: number): string {
  const { value, currency } = formatMoneyParts(amount);
  return `${value}${NBSP}${currency}`;
}

export type DateStyle = "short" | "long" | "datetime" | "time";

const dateFormats: Record<DateStyle, Intl.DateTimeFormat> = {
  // 15 oct. 2026
  short: new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }),
  // jeudi 15 octobre 2026
  long: new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: "full" }),
  // 15/10/2026 14:30
  datetime: new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }),
  // 14:30
  time: new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, timeStyle: "short" }),
};

/** Formats a date in the Africa/Dakar time zone. */
export function formatDate(date: Date | string, style: DateStyle = "short"): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return dateFormats[style].format(value);
}

const pluralRules = new Intl.PluralRules(LOCALE);

/** formatQty(1) → "1 sac", formatQty(12) → "12 sacs". */
export function formatQty(
  quantity: number,
  unit: { one: string; other: string } = { one: "sac", other: "sacs" },
): string {
  assertInteger(quantity, "Quantity");
  const label = pluralRules.select(quantity) === "one" ? unit.one : unit.other;
  return `${formatInteger(quantity)}${NBSP}${label}`;
}

const dateInputFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date as "YYYY-MM-DD" in the Africa/Dakar time zone (value of an <input type="date">). */
export function toDateInputValue(date: Date | string = new Date()): string {
  return dateInputFormat.format(typeof date === "string" ? new Date(date) : date);
}

/**
 * Business date chosen in a form → timestamp. Today keeps the current time (FIFO order of
 * same-day operations); another day is set at noon (Dakar is UTC+0).
 */
export function businessDateToTimestamp(value: string, now: Date = new Date()): string {
  return value === toDateInputValue(now) ? now.toISOString() : `${value}T12:00:00.000Z`;
}
