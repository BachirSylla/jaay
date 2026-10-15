import type { Database } from "@/lib/supabase/database.types";

export type ShopRole = Database["public"]["Enums"]["shop_role"];

/**
 * What each role may see or do in the interface. The database enforces the same rules
 * (RLS + RPC checks); this only hides what a role cannot use.
 */
const FINANCE: readonly ShopRole[] = ["owner", "admin"];
const EVERYONE: readonly ShopRole[] = ["owner", "admin", "manager"];

const rules = {
  /** Supplier prices, margins, supplier balances. */
  viewCosts: FINANCE,
  /** All sales (a manager only sees their own). */
  viewAllSales: FINANCE,
  viewReports: FINANCE,
  viewSuppliers: FINANCE,
  manageSuppliers: FINANCE,
  paySuppliers: FINANCE,
  manageCatalog: FINANCE,
  cancelOperations: FINANCE,
  manageMembers: FINANCE,
  manageSettings: FINANCE,
  recordSale: EVERYONE,
  recordReception: EVERYONE,
  recordReturn: EVERYONE,
  recordExpense: EVERYONE,
  manageCustomers: EVERYONE,
  viewStock: EVERYONE,
} as const satisfies Record<string, readonly ShopRole[]>;

export type Action = keyof typeof rules;

export function can(role: ShopRole, action: Action): boolean {
  return rules[action].includes(role);
}

/** Roles an owner or admin can give to a member (never a second owner). */
export const ASSIGNABLE_ROLES = ["admin", "manager"] as const satisfies readonly ShopRole[];
