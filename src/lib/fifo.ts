/** An available lot of a product, oldest first. */
export type FifoLot = { available: number; unitCost: number };

/**
 * Cost of selling `quantity` bags taken from the oldest lots first, the way create_sale
 * does it. Returns null when the lots do not hold enough bags.
 */
export function fifoCost(lots: FifoLot[], quantity: number): number | null {
  let remaining = quantity;
  let cost = 0;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, lot.available);
    cost += take * lot.unitCost;
    remaining -= take;
  }
  return remaining > 0 ? null : cost;
}
