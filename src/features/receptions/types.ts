import type { Database } from "@/lib/supabase/database.types";

export type OpStatus = Database["public"]["Enums"]["op_status"];

export type ReceptionSummary = {
  id: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  note: string | null;
  status: OpStatus;
  cancelReason: string | null;
  totalQty: number;
  /** null for managers */
  totalCost: number | null;
  deliveryFee: number;
  createdByName: string | null;
};

export type ReceptionLine = {
  lotId: string;
  productId: string;
  productName: string;
  productColor: string | null;
  /** Color of the lot (null: model without colors or stock recorded without color). */
  colorName: string | null;
  photoPath: string | null;
  qtyReceived: number;
  qtySold: number;
  qtyReturned: number;
  /** null for managers */
  unitCost: number | null;
};
