"use server";

import { refresh } from "next/cache";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { customerSchema, type CustomerValues } from "./schemas";
import type { Customer } from "./types";

function parse(values: CustomerValues) {
  return customerSchema.safeParse({
    ...values,
    phone: values.phone ?? "",
    notes: values.notes ?? "",
  });
}

export async function createCustomer(
  shopId: string,
  values: CustomerValues,
): Promise<ActionResult<Customer>> {
  const parsed = parse(values);
  if (!parsed.success || !isUuid(shopId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ shop_id: shopId, ...parsed.data })
    .select("id, name, phone, type, notes, archived_at, created_at")
    .single();
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return {
    ok: true,
    data: {
      id: data.id,
      name: data.name,
      phone: data.phone,
      type: data.type,
      notes: data.notes,
      archivedAt: data.archived_at,
      createdAt: data.created_at,
    },
  };
}

export async function updateCustomer(
  shopId: string,
  id: string,
  values: CustomerValues,
): Promise<ActionResult> {
  const parsed = parse(values);
  if (!parsed.success || !isUuid(shopId) || !isUuid(id)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("shop_id", shopId)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  refresh();
  return { ok: true, data: undefined };
}

export async function setCustomerArchived(
  shopId: string,
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  if (!isUuid(shopId) || !isUuid(id)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("shop_id", shopId)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  refresh();
  return { ok: true, data: undefined };
}
