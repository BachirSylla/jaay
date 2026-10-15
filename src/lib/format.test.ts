import { describe, expect, it } from "vitest";
import { formatDate, formatInteger, formatMoney, formatMoneyParts, formatQty } from "./format";

const NBSP = " ";

describe("formatMoney", () => {
  it("groups thousands with a no-break space and appends F", () => {
    expect(formatMoney(12500)).toBe(`12${NBSP}500${NBSP}F`);
    expect(formatMoney(1250000)).toBe(`1${NBSP}250${NBSP}000${NBSP}F`);
  });

  it("handles zero, small and negative amounts", () => {
    expect(formatMoney(0)).toBe(`0${NBSP}F`);
    expect(formatMoney(950)).toBe(`950${NBSP}F`);
    expect(formatMoney(-61000)).toMatch(new RegExp(`^[-−]61${NBSP}000${NBSP}F$`));
  });

  it("rejects non-integer amounts", () => {
    expect(() => formatMoney(12.5)).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN)).toThrow(RangeError);
  });

  it("exposes value and currency separately", () => {
    expect(formatMoneyParts(24500)).toEqual({ value: `24${NBSP}500`, currency: "F" });
  });
});

describe("formatInteger", () => {
  it("never uses the narrow no-break space", () => {
    expect(formatInteger(1000000)).not.toContain(" ");
  });
});

describe("formatDate", () => {
  it("uses the Africa/Dakar time zone (UTC+0)", () => {
    expect(formatDate("2026-10-15T23:30:00Z", "datetime")).toBe("15/10/2026 23:30");
  });

  it("formats short dates in French", () => {
    expect(formatDate(new Date("2026-09-01T10:00:00Z"))).toBe("1 sept. 2026");
  });
});

describe("formatQty", () => {
  it("uses French plural rules", () => {
    expect(formatQty(0)).toBe(`0${NBSP}sac`);
    expect(formatQty(1)).toBe(`1${NBSP}sac`);
    expect(formatQty(12)).toBe(`12${NBSP}sacs`);
  });
});
