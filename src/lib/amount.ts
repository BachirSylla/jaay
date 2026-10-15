import { formatInteger } from "./format";

/** Largest amount accepted in a field (100 million FCFA). */
export const MAX_AMOUNT = 100_000_000;

/** "12 500" / "12500 F" / "12.500" → 12500. Empty → null. Digits only: no decimals in FCFA. */
export function parseAmount(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

/** 12500 → "12 500" for an input field (no currency). */
export function formatAmountInput(value: number | null | undefined): string {
  return value == null ? "" : formatInteger(value);
}
