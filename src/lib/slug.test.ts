import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

// Same cases as supabase/tests/02_create_shop.test.sql (public.slugify), ligatures excluded.
describe("slugify (preview of public.slugify)", () => {
  it.each([
    ["Zz Test — Sacs & Co", "zz-test-sacs-co"],
    ["zz test sacs co!", "zz-test-sacs-co"],
    ["Zz Élégance Dakar", "zz-elegance-dakar"],
    ["  Zz  --  Çà et là  ", "zz-ca-et-la"],
    ["!!!", "boutique"],
    ["", "boutique"],
    ["Connexion", "connexion"],
    ["Maroquinerie Ndèye Fatou", "maroquinerie-ndeye-fatou"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("is at most 40 characters and never ends with a dash", () => {
    const slug = slugify("Zz " + "abcdefghi ".repeat(5));
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});
