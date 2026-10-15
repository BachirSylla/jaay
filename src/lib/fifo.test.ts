import { describe, expect, it } from "vitest";
import { fifoCost } from "./fifo";
import { fill } from "./i18n";

describe("fifoCost", () => {
  // DATA_MODEL §6: lot A 10 × 5 000, lot B 10 × 5 500, sale of 12 → 61 000.
  const lots = [
    { available: 10, unitCost: 5000 },
    { available: 10, unitCost: 5500 },
  ];

  it("takes the oldest lots first", () => {
    expect(fifoCost(lots, 12)).toBe(61000);
    expect(fifoCost(lots, 3)).toBe(15000);
  });

  it("returns null when stock is short", () => {
    expect(fifoCost(lots, 21)).toBeNull();
  });
});

describe("fill", () => {
  it("replaces placeholders", () => {
    expect(fill("Vente n° {n}", { n: 43 })).toBe("Vente n° 43");
    expect(fill("{a} et {b}", { a: 1 })).toBe("1 et {b}");
  });
});
