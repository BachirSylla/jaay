import type { Database } from "@/lib/supabase/database.types";

export type ReturnSummary = {
  id: string;
  supplierId: string;
  supplierName: string;
  returnedAt: string;
  note: string | null;
  status: Database["public"]["Enums"]["op_status"];
  cancelReason: string | null;
  createdBy: string | null;
  bags: number;
  deliveryFee: number;
  items: {
    productId: string;
    productName: string;
    productColor: string | null;
    quantity: number;
  }[];
};

/**
 * Bags available per supplier, then per `${productId}:${variantKey}` (get_supplier_stock,
 * no cost).
 */
export type SupplierStock = Record<string, Record<string, number>>;
