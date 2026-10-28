"use client";

import { PackageSearch } from "lucide-react";
import { ShareImageButton } from "@/components/shared/ShareImageButton";
import { useShop } from "@/features/shop/shop-context";
import { formatDate } from "@/lib/format";
import { fill, plural } from "@/lib/i18n";
import { fr } from "@/messages/fr";

const t = fr.supplierAccount.stockSheet;

/** Shares the supplier's bags still in the shop (one image per page) on WhatsApp. */
export function ShareSupplierStockButton({
  supplier,
  pages,
  bags,
}: {
  supplier: { id: string; name: string; phone: string | null };
  pages: number;
  bags: number;
}) {
  const { shop } = useShop();
  const today = new Date().toISOString();
  return (
    <ShareImageButton
      files={Array.from({ length: pages }, (_, index) => ({
        url: `/s/${shop.slug}/fournisseurs/${supplier.id}/stock?page=${index + 1}`,
        name: `stock-${today.slice(0, 10)}${pages > 1 ? `-${index + 1}` : ""}.png`,
      }))}
      title={`${t.title} — ${shop.name}`}
      text={fill(t.shareText, {
        shop: shop.name,
        date: formatDate(today),
        bags: plural(bags, t.bags),
      })}
      phone={supplier.phone}
      label={t.share}
      variant="ghost"
      className="text-espresso-ink hover:bg-espresso-ink/10 hover:text-espresso-ink"
      icon={<PackageSearch data-icon="inline-start" aria-hidden="true" />}
    />
  );
}
