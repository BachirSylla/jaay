import { fr, type ErrorCode } from "@/messages/fr";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ErrorCode };

const KNOWN_CODES = new Set<string>(Object.keys(fr.errors));

function isErrorCode(value: string): value is ErrorCode {
  return KNOWN_CODES.has(value);
}

type ErrorLike = { message?: unknown; code?: unknown; status?: unknown };

/**
 * Maps an error from Supabase (Postgres RPC exception, PostgREST, Auth) to a known code.
 * RPCs raise readable codes as the exception message ('SLUG_TAKEN', 'FORBIDDEN'…).
 */
export function toErrorCode(error: unknown): ErrorCode {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const { message, code, status } = error as ErrorLike;
  const text = typeof message === "string" ? message.trim() : "";

  if (isErrorCode(text)) return text;

  switch (code) {
    case "42501":
      return "FORBIDDEN";
    case "23505":
      return "DUPLICATE";
    case "invalid_credentials":
      return "INVALID_CREDENTIALS";
    case "email_exists":
    case "user_already_exists":
      return "EMAIL_TAKEN";
    case "same_password":
      return "SAME_PASSWORD";
    case "weak_password":
      return "WEAK_PASSWORD";
    case "email_not_confirmed":
      return "EMAIL_CONFIRMATION_REQUIRED";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "RATE_LIMITED";
  }
  if (status === 429) return "RATE_LIMITED";
  return "UNKNOWN";
}

export function errorMessage(code: ErrorCode): string {
  return fr.errors[code];
}
