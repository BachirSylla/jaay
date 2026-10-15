export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type SupplierBalance = {
  due: number;
  paid: number;
  /** due − paid; negative = advance paid by the shop (RG10). */
  balance: number;
  qtyReceived: number;
  qtySold: number;
  qtyReturned: number;
  qtyInStock: number;
};

export type SupplierLot = {
  lotId: string;
  receptionId: string;
  productId: string;
  receivedAt: string;
  qtyReceived: number;
  qtySold: number;
  qtyReturned: number;
  qtyAvailable: number;
  unitCost: number;
};

export type SupplierPayment = {
  id: string;
  amount: number;
  method: "wave" | "orange_money" | "cash" | "other";
  paidAt: string;
  note: string | null;
  status: "active" | "cancelled";
  cancelReason: string | null;
};
