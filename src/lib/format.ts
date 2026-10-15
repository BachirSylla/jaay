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
