import { describe, expect, it } from "vitest";
import { toErrorCode } from "./errors";

describe("toErrorCode", () => {
  it("reads RPC exception messages", () => {
    expect(toErrorCode({ message: "SLUG_TAKEN", code: "P0001" })).toBe("SLUG_TAKEN");
    expect(toErrorCode({ message: "INSUFFICIENT_STOCK" })).toBe("INSUFFICIENT_STOCK");
  });

  it("maps Postgres and Auth codes", () => {
    expect(toErrorCode({ message: "permission denied", code: "42501" })).toBe("FORBIDDEN");
    expect(toErrorCode({ message: "x", code: "invalid_credentials" })).toBe("INVALID_CREDENTIALS");
    expect(toErrorCode({ message: "x", code: "user_already_exists" })).toBe("EMAIL_TAKEN");
    expect(toErrorCode({ message: "x", status: 429 })).toBe("RATE_LIMITED");
  });

  it("falls back to UNKNOWN", () => {
    expect(toErrorCode(null)).toBe("UNKNOWN");
    expect(toErrorCode({ message: "boom" })).toBe("UNKNOWN");
  });
});
