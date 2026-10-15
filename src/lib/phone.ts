const DEFAULT_COUNTRY_CODE = "221"; // Senegal

/**
 * Normalizes a phone number to E.164 (+221771234567). Local Senegalese numbers (9 digits)
 * get +221. Returns null when the input cannot be a valid number.
 */
export function toE164(input: string, countryCode = DEFAULT_COUNTRY_CODE): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;

  if (!digits.startsWith("+")) {
    digits = digits.replace(/\D/g, "");
    if (digits.length === 9) digits = `+${countryCode}${digits}`;
    else if (digits.startsWith(countryCode) && digits.length === countryCode.length + 9) {
      digits = `+${digits}`;
    } else return null;
  }

  const normalized = `+${digits.slice(1).replace(/\D/g, "")}`;
  return /^\+[1-9]\d{6,14}$/.test(normalized) ? normalized : null;
}

/** +221771234567 → "+221 77 123 45 67" (Senegal), other numbers unchanged. */
export function formatPhone(e164: string): string {
  const match = /^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return match ? `+221 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : e164;
}

/** Digits only, for https://wa.me/<digits>. */
export function whatsappDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}
