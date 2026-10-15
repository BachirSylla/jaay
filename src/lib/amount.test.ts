import { describe, expect, it } from "vitest";
import { formatAmountInput, parseAmount } from "./amount";
import { bagColorFor } from "./bag-colors";

describe("parseAmount", () => {
  it.each([
    ["12 500", 12500],
    ["12500 F", 12500],
    ["12.500", 12500],
    ["0", 0],
    ["", null],
    ["abc", null],
  ])("%j → %j", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});

describe("formatAmountInput", () => {
  it("groups thousands without currency", () => {
    expect(formatAmountInput(1250000)).toBe("1 250 000");
    expect(formatAmountInput(null)).toBe("");
  });
});

describe("bagColorFor", () => {
  it("maps free-text colors to thumbnail colors", () => {
    expect(bagColorFor("Noir mat").key).toBe("black");
    expect(bagColorFor("Beige clair").key).toBe("sand");
    expect(bagColorFor("Bleu marine").key).toBe("navy");
    expect(bagColorFor(null).key).toBe("brown");
  });
});
