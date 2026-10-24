"use client";

import { ShareImageButton } from "@/components/shared/ShareImageButton";
import { useShop } from "@/features/shop/shop-context";
import { formatDate, formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";

const t = fr.supplierAccount.receipt;

/** Shares the receipt image of a supplier payment (bags paid, account after it) on WhatsApp. */
export function SharePaymentReceiptButton({
  supplier,
  payment,
  iconOnly = false,
}: {
  supplier: { id: string; name: string; phone: string | null };
  payment: { id: string; amount: number; paidAt: string };
  iconOnly?: boolean;
}) {
  const { shop } = useShop();
  return (
    <ShareImageButton
      url={`/s/${shop.slug}/fournisseurs/${supplier.id}/reglements/${payment.id}/recu`}
      fileName={`reglement-${payment.paidAt.slice(0, 10)}.png`}
      title={`${t.title} — ${shop.name}`}
      text={fill(t.shareText, {
        amount: formatMoney(payment.amount),
        supplier: supplier.name,
        date: formatDate(payment.paidAt),
        shop: shop.name,
      })}
      phone={supplier.phone}
      label={`${t.share} — ${formatMoney(payment.amount)}`}
      iconOnly={iconOnly}
    />
  );
}
