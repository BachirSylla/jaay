import { describe, expect, it } from "vitest";
import { lastSevenDays, periodRange } from "./period";

// Thursday October 15th, 2026, 09:41 in Dakar (UTC+0).
const now = new Date("2026-10-15T09:41:00Z");

describe("periodRange", () => {
  it("today", () => {
    const range = periodRange("jour", now);
    expect(range.from.toISOString()).toBe("2026-10-15T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-16T00:00:00.000Z");
  });

  it("this week starts on Monday", () => {
    expect(periodRange("semaine", now).firstDay).toBe("2026-10-12");
  });

  it("this month starts on the 1st", () => {
    expect(periodRange("mois", now).firstDay).toBe("2026-10-01");
  });

  it("free range: inclusive days, swapped when reversed", () => {
    const range = periodRange("libre", now, { from: "2026-10-10", to: "2026-09-01" });
    expect(range.firstDay).toBe("2026-09-01");
    expect(range.lastDay).toBe("2026-10-10");
    expect(range.to.toISOString()).toBe("2026-10-11T00:00:00.000Z");
  });

  it("free range defaults to the last 30 days", () => {
    expect(periodRange("libre", now).firstDay).toBe("2026-09-16");
  });
});

describe("lastSevenDays", () => {
  it("ends today", () => {
    expect(lastSevenDays(now)).toEqual({ firstDay: "2026-10-09", lastDay: "2026-10-15" });
  });
});
