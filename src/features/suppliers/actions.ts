"use server";

import { refresh } from "next/cache";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { isUuid } from "@/lib/uuid";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema, type SupplierValues } from "./schemas";

function parse(values: SupplierValues) {
  return supplierSchema.safeParse({
    ...values,
    phone: values.phone ?? "",
    address: values.address ?? "",
    notes: values.notes ?? "",
  });
}

export async function createSupplier(
  shopId: string,
  values: SupplierValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(values);
  if (!parsed.success || !isUuid(shopId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ shop_id: shopId, ...parsed.data })
    .select("id")
    .single();
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateSupplier(
  shopId: string,
  id: string,
  values: SupplierValues,
): Promise<ActionResult> {
  const parsed = parse(values);
  if (!parsed.success || !isUuid(shopId) || !isUuid(id)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update(parsed.data)
    .eq("shop_id", shopId)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  refresh();
  return { ok: true, data: undefined };
}

export async function setSupplierArchived(
  shopId: string,
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  if (!isUuid(shopId) || !isUuid(id)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("shop_id", shopId)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  refresh();
  return { ok: true, data: undefined };
}
