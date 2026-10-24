import type { Database } from "@/lib/supabase/database.types";

export type Category = { id: string; name: string; position: number };

export type Material = Database["public"]["Enums"]["bag_material"];

/** A color of a model; archived colors are no longer received but their stock still sells. */
export type ProductVariant = {
  id: string;
  color: string;
  position: number;
  archivedAt: string | null;
};

export type ProductPhoto = { id: string; storagePath: string; position: number };

export type Product = {
  id: string;
  name: string;
  /** First active color of the model (thumbnail), else its former free-text color. */
  color: string | null;
  material: Material | null;
  /** Ordered by position. */
  variants: ProductVariant[];
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  suggestedPrice: number | null;
  resellerPrice: number | null;
  lowStockThreshold: number;
  isPublic: boolean;
  archivedAt: string | null;
  /** Ordered by position; the first one is the cover. */
  photos: ProductPhoto[];
};

export type ProductStock = { available: number; isLow: boolean };
