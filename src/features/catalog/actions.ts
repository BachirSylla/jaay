"use server";

import { refresh } from "next/cache";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { previewPathFor } from "@/lib/image";
import { PRODUCT_PHOTOS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { refreshPublicCatalog } from "./cache";
import { categoryNameSchema, productSchema, type ProductValues } from "./schemas";

function parseProduct(values: ProductValues) {
  return productSchema.safeParse({
    ...values,
    color: values.color ?? "",
    description: values.description ?? "",
  });
}

function toRow(values: ProductValues) {
  return {
    name: values.name,
    category_id: values.categoryId,
    color: values.color,
    description: values.description,
    suggested_price: values.suggestedPrice,
    reseller_price: values.resellerPrice,
    low_stock_threshold: values.lowStockThreshold,
    is_public: values.isPublic,
  };
}

export async function createProduct(
  shopId: string,
  values: ProductValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseProduct(values);
  if (!parsed.success || !isUuid(shopId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ shop_id: shopId, ...toRow(parsed.data) })
    .select("id")
    .single();
  if (error) return { ok: false, error: toErrorCode(error) };
  await refreshPublicCatalog(shopId);
  return { ok: true, data: { id: data.id } };
}

export async function updateProduct(
  shopId: string,
  id: string,
  values: ProductValues,
): Promise<ActionResult> {
  const parsed = parseProduct(values);
  if (!parsed.success || !isUuid(shopId) || !isUuid(id)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(toRow(parsed.data))
    .eq("shop_id", shopId)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  await refreshPublicCatalog(shopId);
  refresh();
  return { ok: true, data: undefined };
}

export async function setProductArchived(
  shopId: string,
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  if (!isUuid(shopId) || !isUuid(id)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("shop_id", shopId)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  await refreshPublicCatalog(shopId);
  refresh();
  return { ok: true, data: undefined };
}

/** Records a photo uploaded by the browser to '<shop>/<product>/<file>' (RLS + check). */
export async function registerProductPhoto(
  shopId: string,
  productId: string,
  storagePath: string,
): Promise<ActionResult> {
  if (!isUuid(shopId) || !isUuid(productId)) return { ok: false, error: "VALIDATION" };
  if (!storagePath.startsWith(`${shopId}/${productId}/`)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("product_photos")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("product_photos").insert({
    shop_id: shopId,
    product_id: productId,
    storage_path: storagePath,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { ok: false, error: toErrorCode(error) };

  await refreshPublicCatalog(shopId);
  refresh();
  return { ok: true, data: undefined };
}

export async function deleteProductPhoto(shopId: string, photoId: string): Promise<ActionResult> {
  if (!isUuid(shopId) || !isUuid(photoId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_photos")
    .delete()
    .eq("shop_id", shopId)
    .eq("id", photoId)
    .select("storage_path");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  // The row is gone; a file left behind (network error) is harmless.
  await supabase.storage
    .from(PRODUCT_PHOTOS_BUCKET)
    .remove(data.flatMap((row) => [row.storage_path, previewPathFor(row.storage_path)]));

  await refreshPublicCatalog(shopId);
  refresh();
  return { ok: true, data: undefined };
}

/** Makes a photo the cover by moving it before the others. */
export async function setCoverPhoto(
  shopId: string,
  productId: string,
  photoId: string,
): Promise<ActionResult> {
  if (!isUuid(shopId) || !isUuid(productId) || !isUuid(photoId)) {
    return { ok: false, error: "VALIDATION" };
  }

  const supabase = await createClient();
  const { data: first } = await supabase
    .from("product_photos")
    .select("position")
    .eq("product_id", productId)
    .order("position")
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("product_photos")
    .update({ position: (first?.position ?? 0) - 1 })
    .eq("shop_id", shopId)
    .eq("id", photoId)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  await refreshPublicCatalog(shopId);
  refresh();
  return { ok: true, data: undefined };
}

export async function createCategory(shopId: string, name: string): Promise<ActionResult> {
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success || !isUuid(shopId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("categories")
    .select("position")
    .eq("shop_id", shopId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("categories")
    .insert({ shop_id: shopId, name: parsed.data, position: (last?.position ?? 0) + 1 });
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function renameCategory(
  shopId: string,
  id: string,
  name: string,
): Promise<ActionResult> {
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success || !isUuid(shopId) || !isUuid(id)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.data })
    .eq("shop_id", shopId)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  refresh();
  return { ok: true, data: undefined };
}
