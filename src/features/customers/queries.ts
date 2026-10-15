import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Customer, CustomerType } from "./types";

const COLUMNS = "id, name, phone, type, notes, archived_at, created_at";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  type: CustomerType;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

function toCustomer(row: Row): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    type: row.type,
    notes: row.notes,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function listCustomers(shopId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(COLUMNS)
    .eq("shop_id", shopId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toCustomer);
}

export async function getCustomer(shopId: string, id: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(COLUMNS)
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toCustomer(data) : null;
}
