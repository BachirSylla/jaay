import { describe, expect, it } from "vitest";
import { formatPhone, toE164, whatsappDigits } from "./phone";

describe("toE164", () => {
  it.each([
    ["77 123 45 67", "+221771234567"],
    ["771234567", "+221771234567"],
    ["+221 77 123 45 67", "+221771234567"],
    ["00221771234567", "+221771234567"],
    ["221771234567", "+221771234567"],
    ["+33 6 12 34 56 78", "+33612345678"],
  ])("%s → %s", (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each(["", "   ", "12", "abc", "+0123456"])("rejects %j", (input) => {
    expect(toE164(input)).toBeNull();
  });
});

describe("formatPhone / whatsappDigits", () => {
  it("formats Senegalese numbers", () => {
    expect(formatPhone("+221771234567")).toBe("+221 77 123 45 67");
    expect(formatPhone("+33612345678")).toBe("+33612345678");
  });

  it("keeps digits for wa.me", () => {
    expect(whatsappDigits("+221771234567")).toBe("221771234567");
  });
});
