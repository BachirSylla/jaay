import { describe, expect, it } from "vitest";
import { passwordChangeSchema, profileSchema } from "./schemas";

describe("passwordChangeSchema", () => {
  it("requires the current password and a confirmed new one of 8+ characters", () => {
    const ok = {
      currentPassword: "old",
      newPassword: "nouveau-mdp",
      confirmPassword: "nouveau-mdp",
    };
    expect(passwordChangeSchema.safeParse(ok).success).toBe(true);
    expect(passwordChangeSchema.safeParse({ ...ok, confirmPassword: "autre-mdp" }).success).toBe(
      false,
    );
    expect(
      passwordChangeSchema.safeParse({ ...ok, newPassword: "court", confirmPassword: "court" })
        .success,
    ).toBe(false);
    expect(passwordChangeSchema.safeParse({ ...ok, currentPassword: "" }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("normalizes the phone to E.164", () => {
    expect(profileSchema.parse({ fullName: " Awa Diop ", phone: "77 123 45 67" })).toEqual({
      fullName: "Awa Diop",
      phone: "+221771234567",
    });
    expect(profileSchema.parse({ fullName: "Awa", phone: "" }).phone).toBeNull();
  });
});
