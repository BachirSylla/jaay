import "server-only";
import type { PaymentMethod, SaleChannel } from "@/features/sales/types";
import { createClient } from "@/lib/supabase/server";

export type Dashboard = {
  revenue: number;
  salesCount: number;
  bags: number;
  byChannel: { channel: SaleChannel; amount: number; count: number }[];
  byPayment: { method: PaymentMethod; amount: number }[];
  topProducts: { productId: string; name: string; bags: number; revenue: number }[];
  lowStock: {
    productId: string;
    name: string;
    color: string | null;
    available: number;
    threshold: number;
  }[];
  /** Owner/admin only (null for managers). */
  cost: number | null;
  margin: number | null;
  expenses: number | null;
  netProfit: number | null;
  supplierBalances: { supplierId: string; name: string; balance: number }[] | null;
};

type Raw = {
  revenue: number;
  sales_count: number;
  bags: number;
  by_channel: { channel: SaleChannel; amount: number; count: number }[];
  by_payment: { method: PaymentMethod; amount: number }[];
  top_products: { product_id: string; name: string; bags: number; revenue: number }[];
  low_stock: {
    product_id: string;
    name: string;
    color: string | null;
    available: number;
    threshold: number;
  }[];
  cost: number | null;
  margin: number | null;
  expenses: number | null;
  net_profit: number | null;
  supplier_balances?: { supplier_id: string; name: string; balance: number }[];
};

export async function getDashboard(shopId: string, from: Date, to: Date): Promise<Dashboard> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard", {
    p_shop_id: shopId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;
  const raw = data as unknown as Raw;
  return {
    revenue: raw.revenue,
    salesCount: raw.sales_count,
    bags: raw.bags,
    byChannel: raw.by_channel,
    byPayment: raw.by_payment,
    topProducts: raw.top_products.map((p) => ({
      productId: p.product_id,
      name: p.name,
      bags: p.bags,
      revenue: p.revenue,
    })),
    lowStock: raw.low_stock.map((p) => ({
      productId: p.product_id,
      name: p.name,
      color: p.color,
      available: p.available,
      threshold: p.threshold,
    })),
    cost: raw.cost,
    margin: raw.margin,
    expenses: raw.expenses,
    netProfit: raw.net_profit,
    supplierBalances:
      raw.supplier_balances?.map((b) => ({
        supplierId: b.supplier_id,
        name: b.name,
        balance: b.balance,
      })) ?? null,
  };
}

export type DailySales = { day: string; revenue: number; salesCount: number }[];

export async function getDailySales(
  shopId: string,
  firstDay: string,
  lastDay: string,
): Promise<DailySales> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_daily_sales", {
    p_shop_id: shopId,
    p_from: firstDay,
    p_to: lastDay,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    day: row.day,
    revenue: row.revenue,
    salesCount: row.sales_count,
  }));
}
