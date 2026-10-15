import { describe, expect, it } from "vitest";
import { safeNextPath, signUpSchema } from "./schemas";

describe("signUpSchema", () => {
  it("normalizes the e-mail and trims the name", () => {
    const parsed = signUpSchema.parse({
      fullName: "  Awa Diop ",
      email: " Awa@Example.COM ",
      password: "motdepasse",
    });
    expect(parsed).toEqual({
      fullName: "Awa Diop",
      email: "awa@example.com",
      password: "motdepasse",
    });
  });

  it("rejects short passwords and invalid e-mails", () => {
    expect(signUpSchema.safeParse({ fullName: "Awa", email: "x", password: "123" }).success).toBe(
      false,
    );
  });
});

describe("safeNextPath", () => {
  it("accepts app paths only", () => {
    expect(safeNextPath("/s/chez-awa/ventes")).toBe("/s/chez-awa/ventes");
    expect(safeNextPath("/bienvenue")).toBe("/bienvenue");
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/connexion")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
