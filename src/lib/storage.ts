export const PRODUCT_PHOTOS_BUCKET = "product-photos";

/** Public URL of a file of the public product-photos bucket. */
export function productPhotoUrl(storagePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${PRODUCT_PHOTOS_BUCKET}/${storagePath}`;
}

export const SHOP_LOGOS_BUCKET = "shop-logos";

export function shopLogoUrl(logoPath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${SHOP_LOGOS_BUCKET}/${logoPath}`;
}
