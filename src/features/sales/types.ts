import type { Database } from "@/lib/supabase/database.types";

export type SaleChannel = Database["public"]["Enums"]["sale_channel"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type CustomerType = Database["public"]["Enums"]["customer_type"];
export type OpStatus = Database["public"]["Enums"]["op_status"];

export type SaleLine = {
  id: string;
  productId: string;
  productName: string;
  productColor: string | null;
  photoPath: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Supplier cost of the line (FIFO allocations): null for managers. */
  cost: number | null;
};

export type Sale = {
  id: string;
  number: number;
  soldAt: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerType: CustomerType;
  channel: SaleChannel;
  totalAmount: number;
  note: string | null;
  status: OpStatus;
  cancelReason: string | null;
  createdBy: string | null;
  lines: SaleLine[];
  payments: { method: PaymentMethod; amount: number }[];
  /** Total supplier cost and margin: null for managers. */
  cost: number | null;
  margin: number | null;
  bags: number;
};
