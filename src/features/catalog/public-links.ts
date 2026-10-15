import { formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { whatsappDigits } from "@/lib/phone";
import { siteUrl } from "@/lib/site";
import { fr } from "@/messages/fr";

export function publicProductUrl(slug: string, productId: string): string {
  return `${siteUrl()}/b/${slug}/${productId}`;
}

/** wa.me link with a pre-filled order message for one product. */
export function orderLink(
  shop: { name: string; slug: string; whatsappPhone: string },
  product: { id: string; name: string; price: number | null },
): string {
  const message = fill(fr.publicCatalog.orderMessage, {
    shop: shop.name,
    name: product.name,
    price: product.price !== null ? ` (${formatMoney(product.price)})` : "",
    url: publicProductUrl(shop.slug, product.id),
  });
  return `https://wa.me/${whatsappDigits(shop.whatsappPhone)}?text=${encodeURIComponent(message)}`;
}

/** wa.me link to contact the shop about the catalog. */
export function contactLink(shop: { name: string; slug: string; whatsappPhone: string }): string {
  const message = fill(fr.publicCatalog.contactMessage, {
    shop: shop.name,
    url: `${siteUrl()}/b/${shop.slug}`,
  });
  return `https://wa.me/${whatsappDigits(shop.whatsappPhone)}?text=${encodeURIComponent(message)}`;
}
