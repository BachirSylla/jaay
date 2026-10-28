/** Models per image of the supplier stock sheet (the photos stay readable on a phone). */
export const STOCK_ROWS_PER_PAGE = 8;

export function stockPageCount(rows: number): number {
  return Math.max(1, Math.ceil(rows / STOCK_ROWS_PER_PAGE));
}

/** One model (at one supplier price) still in stock, with its colors. */
export type StockSheetRow = {
  key: string;
  name: string;
  /** Thumbnail color when there is no photo. */
  color: string | null;
  photoPath: string | null;
  unitCost: number;
  bags: number;
  /** Bags per color, only when the model has colors ("Sans couleur" for the uncolored ones). */
  colors: { color: string | null; label: string; bags: number }[];
};
