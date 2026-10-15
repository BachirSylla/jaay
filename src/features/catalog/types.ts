export type Category = { id: string; name: string; position: number };

export type ProductPhoto = { id: string; storagePath: string; position: number };

export type Product = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  suggestedPrice: number | null;
  resellerPrice: number | null;
  lowStockThreshold: number;
  isPublic: boolean;
  archivedAt: string | null;
  /** Ordered by position; the first one is the cover. */
  photos: ProductPhoto[];
};

export type ProductStock = { available: number; isLow: boolean };
