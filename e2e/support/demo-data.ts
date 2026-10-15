import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

function must<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  if (result.data === null) throw new Error("no data");
  return result.data;
}

/**
 * Realistic shop content for e2e and visual checks, written with the OWNER's session
 * (so RLS applies exactly as in the app). Extended phase after phase.
 */
export async function seedDemoData(client: Client, shopId: string) {
  const categories = must(await client.from("categories").select("id, name").eq("shop_id", shopId));
  const category = (name: string) => categories.find((c) => c.name === name)?.id ?? null;

  const suppliers = must(
    await client
      .from("suppliers")
      .insert(
        [
          {
            shop_id: shopId,
            name: "Ibrahima Maroquinerie",
            phone: "+221765554433",
            address: "Marché HLM, Dakar",
            notes: "Livre le mardi.",
          },
          { shop_id: shopId, name: "Atelier Ndèye", phone: "+221781234567" },
        ],
        { defaultToNull: false },
      )
      .select("id, name"),
  );

  const products = must(
    await client
      .from("products")
      .insert(
        [
          {
            shop_id: shopId,
            name: "Cabas cuir grainé",
            color: "Noir",
            category_id: category("Sacs à main"),
            suggested_price: 8000,
            reseller_price: 7000,
            low_stock_threshold: 2,
          },
          {
            shop_id: shopId,
            name: "Sac seau tressé",
            color: "Caramel",
            category_id: category("Sacs à main"),
            suggested_price: 12500,
            reseller_price: 11000,
          },
          {
            shop_id: shopId,
            name: "Sac à dos city",
            color: "Bleu nuit",
            category_id: category("Sacs à dos"),
            suggested_price: 15000,
            reseller_price: 13000,
          },
          {
            shop_id: shopId,
            name: "Pochette soirée",
            color: "Sable",
            category_id: category("Autres"),
            suggested_price: 6000,
            reseller_price: 5000,
            low_stock_threshold: 3,
          },
          {
            shop_id: shopId,
            name: "Sac de voyage week-end",
            color: "Marron",
            category_id: category("Sacs de voyage"),
            suggested_price: 25000,
            reseller_price: 22000,
            is_public: false,
          },
        ],
        { defaultToNull: false },
      )
      .select("id, name"),
  );

  const customers = must(
    await client
      .from("customers")
      .insert(
        [
          {
            shop_id: shopId,
            name: "Mariama Ba",
            phone: "+221701112233",
            type: "reseller",
            notes: "Revend à Thiès.",
          },
          { shop_id: shopId, name: "Aïssatou Diallo", phone: "+221775556677", type: "individual" },
          { shop_id: shopId, name: "Khady Sow", type: "individual" },
        ],
        { defaultToNull: false },
      )
      .select("id, name"),
  );

  return { suppliers, products, customers };
}

type Demo = Awaited<ReturnType<typeof seedDemoData>>;

/** Two receptions from the main supplier: older lot at 5 000, newer at 5 500 (FIFO cases). */
export async function seedDemoStock(client: Client, shopId: string, demo: Demo) {
  const [cabas, seau, dos, pochette] = demo.products;
  const supplier = demo.suppliers[0];
  const first = must(
    await client.rpc("create_reception", {
      p_shop_id: shopId,
      p_supplier_id: supplier.id,
      p_received_at: "2026-09-01T10:00:00Z",
      p_items: [
        { product_id: cabas.id, quantity: 10, unit_cost: 5000 },
        { product_id: seau.id, quantity: 6, unit_cost: 8000 },
        { product_id: dos.id, quantity: 4, unit_cost: 9500 },
        { product_id: pochette.id, quantity: 2, unit_cost: 3500 },
      ],
      p_delivery_fee: 2000,
      p_note: "Premier dépôt de la saison.",
    }),
  );
  const second = must(
    await client.rpc("create_reception", {
      p_shop_id: shopId,
      p_supplier_id: supplier.id,
      p_received_at: "2026-09-20T10:00:00Z",
      p_items: [{ product_id: cabas.id, quantity: 10, unit_cost: 5500 }],
      p_delivery_fee: 1500,
    }),
  );
  return { receptionIds: [first, second] };
}

/** A few sales on different channels and payment methods (needs seedDemoStock). */
export async function seedDemoSales(client: Client, shopId: string, demo: Demo) {
  const [cabas, seau, dos, pochette] = demo.products;
  const [mariama, aissatou] = demo.customers;
  const sale = async (
    customerId: string | null,
    type: "individual" | "reseller",
    channel: "whatsapp" | "instagram" | "in_person" | "tiktok",
    soldAt: string,
    items: { product_id: string; quantity: number; unit_price: number }[],
    payments: { method: "wave" | "orange_money" | "cash"; amount: number }[],
  ) =>
    must(
      await client.rpc("create_sale", {
        p_shop_id: shopId,
        p_customer_id: customerId as string,
        p_customer_type: type,
        p_channel: channel,
        p_sold_at: soldAt,
        p_items: items,
        p_payments: payments,
      }),
    );

  const now = Date.now();
  const at = (hoursAgo: number) => new Date(now - hoursAgo * 3600_000).toISOString();
  const sales = [
    await sale(
      mariama.id,
      "reseller",
      "whatsapp",
      at(50),
      [{ product_id: cabas.id, quantity: 3, unit_price: 7000 }],
      [{ method: "wave", amount: 21000 }],
    ),
    await sale(
      aissatou.id,
      "individual",
      "instagram",
      at(26),
      [
        { product_id: seau.id, quantity: 1, unit_price: 12500 },
        { product_id: pochette.id, quantity: 1, unit_price: 6000 },
      ],
      [
        { method: "orange_money", amount: 10000 },
        { method: "cash", amount: 8500 },
      ],
    ),
    await sale(
      null,
      "individual",
      "in_person",
      at(2),
      [{ product_id: cabas.id, quantity: 1, unit_price: 8000 }],
      [{ method: "cash", amount: 8000 }],
    ),
    await sale(
      null,
      "individual",
      "tiktok",
      at(1),
      [{ product_id: dos.id, quantity: 1, unit_price: 15000 }],
      [{ method: "wave", amount: 15000 }],
    ),
  ];
  return { saleIds: sales.map((s) => s.id) };
}

/** A supplier payment, a return of unsold bags and two expenses (needs seedDemoSales). */
export async function seedDemoAccount(client: Client, shopId: string, demo: Demo) {
  const supplier = demo.suppliers[0];
  must(
    await client.rpc("create_supplier_payment", {
      p_shop_id: shopId,
      p_supplier_id: supplier.id,
      p_amount: 20000,
      p_method: "wave",
      p_note: "Acompte",
    }),
  );
  const returnId = must(
    await client.rpc("create_return", {
      p_shop_id: shopId,
      p_supplier_id: supplier.id,
      p_returned_at: new Date().toISOString(),
      p_items: [{ product_id: demo.products[3].id, quantity: 1 }],
      p_delivery_fee: 1000,
      p_note: "Pochette abîmée",
    }),
  );
  must(
    await client
      .from("expenses")
      .insert(
        [
          { shop_id: shopId, category: "packaging", amount: 2500, note: "Sachets kraft" },
          { shop_id: shopId, category: "advertising", amount: 5000, note: "Sponsoring Instagram" },
        ],
        { defaultToNull: false },
      )
      .select("id"),
  );
  return { returnId };
}
