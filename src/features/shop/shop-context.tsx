"use client";

import { createContext, use, type ReactNode } from "react";
import { can, type Action } from "@/lib/permissions";
import type { ShopContext } from "./types";

const Context = createContext<ShopContext | null>(null);

/** Gives client components the active shop, the user's role and their other shops. */
export function ShopProvider({ value, children }: { value: ShopContext; children: ReactNode }) {
  return <Context value={value}>{children}</Context>;
}

export function useShop(): ShopContext {
  const value = use(Context);
  if (!value) throw new Error("useShop must be used inside <ShopProvider>");
  return value;
}

/** can(role, action) for the current shop. */
export function useCan(action: Action): boolean {
  return can(useShop().role, action);
}
