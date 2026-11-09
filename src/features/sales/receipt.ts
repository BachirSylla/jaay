import { formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";
import type { Sale } from "./types";

/** Short message sent with the receipt image (or alone when files cannot be shared). */
export function receiptText(sale: Sale, shopName: string): string {
  return fill(fr.sales.receiptMessage, {
    shop: shopName,
    n: sale.number,
    amount: formatMoney(sale.totalAmount),
  });
}
