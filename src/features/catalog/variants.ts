import { fr } from "@/messages/fr";
import type { Product } from "./types";

/** Key of the stock without color: bags recorded before the model had colors. */
export const NO_VARIANT = "none";

/** Bags available per product id, then per color key (variant id, or NO_VARIANT). */
export type VariantStock = Record<string, Record<string, number>>;

export type ColorOption = {
  key: string;
  /** Color name, or "Sans couleur". */
  label: string;
  /** Color used for the dot (null for the stock without color). */
  color: string | null;
  available: number;
};

export function variantKey(variantId: string | null | undefined): string {
  return variantId ?? NO_VARIANT;
}

export function variantIdOf(key: string): string | null {
  return key === NO_VARIANT ? null : key;
}

export function hasColors(product: Pick<Product, "variants">): boolean {
  return product.variants.some((v) => !v.archivedAt);
}

export function variantLabel(product: Pick<Product, "variants"> | undefined, key: string): string {
  if (key === NO_VARIANT) return fr.variants.none;
  return product?.variants.find((v) => v.id === key)?.color ?? fr.variants.none;
}

/**
 * Colors a line of this model can take.
 * - reception: the active colors, or the single "no color" choice for a model without colors;
 * - sale / return: every color (archived ones included) and the uncolored stock that still
 *   hold bags, according to `stock`.
 */
export function colorOptions(
  product: Pick<Product, "variants">,
  stock: Record<string, number> | undefined,
  usage: "reception" | "stock",
): ColorOption[] {
  if (usage === "reception") {
    const active = product.variants.filter((v) => !v.archivedAt);
    if (active.length === 0) {
      return [{ key: NO_VARIANT, label: fr.variants.none, color: null, available: 0 }];
    }
    return active.map((v) => ({
      key: v.id,
      label: v.color,
      color: v.color,
      available: stock?.[v.id] ?? 0,
    }));
  }
  const options: ColorOption[] = product.variants
    .map((v) => ({ key: v.id, label: v.color, color: v.color, available: stock?.[v.id] ?? 0 }))
    .filter((option) => option.available > 0);
  const uncolored = stock?.[NO_VARIANT] ?? 0;
  if (uncolored > 0) {
    options.push({ key: NO_VARIANT, label: fr.variants.none, color: null, available: uncolored });
  }
  return options;
}
