"use client";

import { ShareImageButton } from "@/components/shared/ShareImageButton";
import { useShop } from "@/features/shop/shop-context";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";

/** Shares the receipt image of a sale (and its text) on WhatsApp. */
export function ShareReceiptButton({
  saleId,
  saleNumber,
  text,
  customerPhone,
}: {
  saleId: string;
  saleNumber: number;
  text: string;
  customerPhone: string | null;
}) {
  const { shop } = useShop();
  return (
    <ShareImageButton
      files={[{ url: `/s/${shop.slug}/ventes/${saleId}/recu`, name: `recu-${saleNumber}.png` }]}
      title={fill(fr.sales.shareText, { shop: shop.name })}
      text={text}
      phone={customerPhone}
      label={fr.sales.share}
    />
  );
}
