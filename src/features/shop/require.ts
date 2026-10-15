import "server-only";
import { notFound } from "next/navigation";
import { can, type Action } from "@/lib/permissions";
import { getShopContext } from "./queries";
import type { ShopContext } from "./types";

/** Resolves the shop of the page params; 404 when the user is not a member. */
export async function requireShop(params: Promise<{ shopSlug: string }>): Promise<ShopContext> {
  const { shopSlug } = await params;
  const context = await getShopContext(shopSlug);
  if (!context) notFound();
  return context;
}

/** Same as requireShop, plus whether the role allows `action` (the page shows Forbidden). */
export async function requireShopAction(
  params: Promise<{ shopSlug: string }>,
  action: Action,
): Promise<{ context: ShopContext; allowed: boolean }> {
  const context = await requireShop(params);
  return { context, allowed: can(context.role, action) };
}
