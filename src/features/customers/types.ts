import type { Database } from "@/lib/supabase/database.types";

export type CustomerType = Database["public"]["Enums"]["customer_type"];

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  type: CustomerType;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
};
