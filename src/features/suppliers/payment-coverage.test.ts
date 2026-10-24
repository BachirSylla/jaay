import { describe, expect, it } from "vitest";
import { paymentCoverage, type SoldBags } from "./payment-coverage";

const sold: SoldBags[] = [
  { productId: "bureau", variantId: "marron", quantity: 2, unitCost: 5500 },
  { productId: "nomade", variantId: null, quantity: 1, unitCost: 5500 },
  { productId: "urbain", variantId: null, quantity: 2, unitCost: 5000 },
];
// Total sold: 2 × 5 500 + 5 500 + 2 × 5 000 = 26 500 F.

describe("paymentCoverage", () => {
  it("first payment pays the first bags sold", () => {
    const result = paymentCoverage(sold, 0, 11000);
    expect(result.lines).toEqual([
      {
        productId: "bureau",
        variantId: "marron",
        unitCost: 5500,
        bags: 2,
        partial: 0,
        amount: 11000,
      },
    ]);
    expect(result.covered).toBe(11000);
    expect(result.advance).toBe(0);
  });

  it("a bag paid over two payments is partial on both", () => {
    const first = paymentCoverage(sold, 0, 10000);
    expect(first.lines).toEqual([
      {
        productId: "bureau",
        variantId: "marron",
        unitCost: 5500,
        bags: 1,
        partial: 4500,
        amount: 10000,
      },
    ]);
    const second = paymentCoverage(sold, 10000, 6500);
    expect(second.lines).toEqual([
      {
        productId: "bureau",
        variantId: "marron",
        unitCost: 5500,
        bags: 0,
        partial: 1000,
        amount: 1000,
      },
      { productId: "nomade", variantId: null, unitCost: 5500, bags: 1, partial: 0, amount: 5500 },
    ]);
  });

  it("a payment above the sold bags leaves an advance", () => {
    const result = paymentCoverage(sold, 20000, 10000);
    expect(result.lines).toEqual([
      {
        productId: "urbain",
        variantId: null,
        unitCost: 5000,
        bags: 1,
        partial: 1500,
        amount: 6500,
      },
    ]);
    expect(result.covered).toBe(6500);
    expect(result.advance).toBe(3500);
  });

  it("everything already paid: the whole payment is an advance", () => {
    const result = paymentCoverage(sold, 26500, 5000);
    expect(result.lines).toEqual([]);
    expect(result.advance).toBe(5000);
  });
});
