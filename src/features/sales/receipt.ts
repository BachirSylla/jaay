import { formatDate, formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";
import type { Sale } from "./types";

/** Plain-text receipt, sent with the image (or alone when files cannot be shared). */
export function receiptText(sale: Sale, shopName: string): string {
  const lines = sale.lines.map(
    (line) => `${line.quantity} × ${line.productName} — ${formatMoney(line.lineTotal)}`,
  );
  const payments = sale.payments
    .map((p) => `${fr.paymentMethods[p.method]} ${formatMoney(p.amount)}`)
    .join(" + ");
  return [
    `${shopName} — ${fill(fr.sales.number, { n: sale.number })}`,
    formatDate(sale.soldAt, "datetime"),
    "",
    ...lines,
    "",
    `${fr.sales.total} : ${formatMoney(sale.totalAmount)}`,
    `${fr.sales.payments} : ${payments}`,
    "",
    fr.sales.thanks,
  ].join("\n");
}
