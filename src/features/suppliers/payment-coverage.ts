/** Bags of one sale line taken from this supplier's lots (one FIFO allocation). */
export type SoldBags = {
  productId: string;
  variantId: string | null;
  quantity: number;
  /** Supplier price of each bag (frozen on the allocation). */
  unitCost: number;
};

export type CoveredLine = {
  productId: string;
  variantId: string | null;
  unitCost: number;
  /** Bags fully paid by this payment. */
  bags: number;
  /** Part of a bag paid by this payment (the rest by the payment before or after), 0 if none. */
  partial: number;
  amount: number;
};

export type PaymentCoverage = {
  lines: CoveredLine[];
  /** Amount of the payment that went to sold bags. */
  covered: number;
  /** Amount paid ahead of sales (no sold bag left to pay). */
  advance: number;
};

/**
 * Which sold bags a payment pays for, "first sold, first paid": payments settle the sold bags in
 * the order of the sales. `sold` is in sale order; `paidBefore` is the total of the payments made
 * before this one. A bag paid over two payments shows as `partial` on both receipts.
 */
export function paymentCoverage(
  sold: SoldBags[],
  paidBefore: number,
  amount: number,
): PaymentCoverage {
  const start = paidBefore;
  const end = paidBefore + amount;
  const byKey = new Map<string, CoveredLine>();
  let position = 0;

  for (const line of sold) {
    if (position >= end) break;
    for (let bag = 0; bag < line.quantity && line.unitCost > 0; bag += 1) {
      const bagStart = position;
      const bagEnd = position + line.unitCost;
      position = bagEnd;
      const paid = Math.max(0, Math.min(end, bagEnd) - Math.max(start, bagStart));
      if (paid === 0) continue;
      const key = `${line.productId}:${line.variantId ?? ""}:${line.unitCost}`;
      const current = byKey.get(key) ?? {
        productId: line.productId,
        variantId: line.variantId,
        unitCost: line.unitCost,
        bags: 0,
        partial: 0,
        amount: 0,
      };
      if (paid === line.unitCost) current.bags += 1;
      else current.partial += paid;
      current.amount += paid;
      byKey.set(key, current);
    }
  }

  const lines = [...byKey.values()];
  const covered = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, covered, advance: amount - covered };
}
