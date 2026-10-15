import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "./types";

const COLUMNS = "id, name, phone, address, notes, archived_at, created_at";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

function toSupplier(row: Row): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

/** All suppliers of the shop, archived ones included (the list filters them). */
export async function listSuppliers(shopId: string): Promise<Supplier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select(COLUMNS)
    .eq("shop_id", shopId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toSupplier);
}

export async function getSupplier(shopId: string, id: string): Promise<Supplier | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select(COLUMNS)
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toSupplier(data) : null;
}
