import { describe, expect, it } from "vitest";
import { matchesSearch } from "./SearchInput";

describe("matchesSearch", () => {
  it("ignores case and accents", () => {
    expect(matchesSearch("Élégance Dakar", "elegance")).toBe(true);
    expect(matchesSearch("Cabas noir", "  CABAS ")).toBe(true);
    expect(matchesSearch("Cabas noir", "rouge")).toBe(false);
  });
});
