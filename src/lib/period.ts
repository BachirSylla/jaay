import { toDateInputValue } from "./format";

/** Periods of the dashboard and reports (URL values, in French). */
export const PERIODS = ["jour", "semaine", "mois", "libre"] as const;
export type PeriodKey = (typeof PERIODS)[number];

export type PeriodRange = {
  key: PeriodKey;
  /** Inclusive start / exclusive end, as timestamps. */
  from: Date;
  to: Date;
  /** Inclusive first and last day, "YYYY-MM-DD" (Africa/Dakar = UTC). */
  firstDay: string;
  lastDay: string;
};

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

export function isPeriodKey(value: unknown): value is PeriodKey {
  return typeof value === "string" && (PERIODS as readonly string[]).includes(value);
}

/**
 * Today, this week (since Monday), this month (since the 1st), or a free range of days.
 * Africa/Dakar is UTC+0 all year, so days are UTC days.
 */
export function periodRange(
  key: PeriodKey,
  now: Date = new Date(),
  custom?: { from?: string; to?: string },
): PeriodRange {
  const today = startOfDay(toDateInputValue(now));
  let from = today;
  let lastDay = today;

  if (key === "semaine") {
    const weekday = (today.getUTCDay() + 6) % 7; // Monday = 0
    from = addDays(today, -weekday);
  } else if (key === "mois") {
    from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  } else if (key === "libre") {
    const valid = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
    const customFrom = valid(custom?.from);
    const customTo = valid(custom?.to);
    from = customFrom ? startOfDay(customFrom) : addDays(today, -29);
    lastDay = customTo ? startOfDay(customTo) : today;
    if (lastDay < from) [from, lastDay] = [lastDay, from];
    if (lastDay.getTime() - from.getTime() > 366 * DAY) from = addDays(lastDay, -366);
  }

  return {
    key,
    from,
    to: addDays(lastDay, 1),
    firstDay: toDateInputValue(from),
    lastDay: toDateInputValue(lastDay),
  };
}

/** The 7 days ending today, for the "sales of the week" chart. */
export function lastSevenDays(now: Date = new Date()): { firstDay: string; lastDay: string } {
  const today = startOfDay(toDateInputValue(now));
  return { firstDay: toDateInputValue(addDays(today, -6)), lastDay: toDateInputValue(today) };
}
