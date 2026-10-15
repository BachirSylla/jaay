import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { catalogTag } from "./cache";

export type PublicProduct = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  category: string | null;
  /** null: "price on request" (or no suggested price). */
  price: number | null;
  photos: string[];
};

export type PublicCatalog = {
  shop: {
    name: string;
    slug: string;
    logoPath: string | null;
    whatsappPhone: string | null;
    showPrices: boolean;
  };
  products: PublicProduct[];
};

type Raw = {
  shop: {
    name: string;
    slug: string;
    logo_path: string | null;
    whatsapp_phone: string | null;
    show_prices: boolean;
  };
  products: PublicProduct[];
};

/**
 * Public catalog of a shop, shared between visitors and cached for a minute (stock moves,
 * but WhatsApp previews and visitors get a fast page). null: unknown or disabled catalog.
 */
export async function getPublicCatalog(slug: string): Promise<PublicCatalog | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  cacheTag(catalogTag(slug));

  const { data, error } = await createPublicClient().rpc("get_public_catalog", { p_slug: slug });
  if (error) throw error;
  if (!data) return null;
  const raw = data as unknown as Raw;
  return {
    shop: {
      name: raw.shop.name,
      slug: raw.shop.slug,
      logoPath: raw.shop.logo_path,
      whatsappPhone: raw.shop.whatsapp_phone,
      showPrices: raw.shop.show_prices,
    },
    products: raw.products,
  };
}
