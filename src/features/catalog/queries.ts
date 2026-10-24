import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Category, Material, Product } from "./types";

const PRODUCT_COLUMNS = `
  id, name, color, material, description, category_id, suggested_price, reseller_price,
  low_stock_threshold, is_public, archived_at,
  category:categories (name),
  photos:product_photos (id, storage_path, position),
  variants:product_variants (id, color, position, archived_at)
`;

type ProductRow = {
  id: string;
  name: string;
  color: string | null;
  material: Material | null;
  description: string | null;
  category_id: string | null;
  suggested_price: number | null;
  reseller_price: number | null;
  low_stock_threshold: number;
  is_public: boolean;
  archived_at: string | null;
  category: { name: string } | null;
  photos: { id: string; storage_path: string; position: number }[];
  variants: { id: string; color: string; position: number; archived_at: string | null }[];
};

function toProduct(row: ProductRow): Product {
  const variants = [...row.variants]
    .sort((a, b) => a.position - b.position || a.color.localeCompare(b.color))
    .map((v) => ({ id: v.id, color: v.color, position: v.position, archivedAt: v.archived_at }));
  return {
    id: row.id,
    name: row.name,
    color: variants.find((v) => !v.archivedAt)?.color ?? row.color,
    material: row.material,
    variants,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category?.name ?? null,
    suggestedPrice: row.suggested_price,
    resellerPrice: row.reseller_price,
    lowStockThreshold: row.low_stock_threshold,
    isPublic: row.is_public,
    archivedAt: row.archived_at,
    photos: [...row.photos]
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({
        id: photo.id,
        storagePath: photo.storage_path,
        position: photo.position,
      })),
  };
}

export async function listCategories(shopId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, position")
    .eq("shop_id", shopId)
    .order("position")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

/** All products of the shop (archived included, the screens filter them). */
export async function listProducts(shopId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("shop_id", shopId)
    .order("name");
  if (error) throw error;
  return ((data ?? []) as ProductRow[]).map(toProduct);
}

export async function getProduct(shopId: string, id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as ProductRow) : null;
}
