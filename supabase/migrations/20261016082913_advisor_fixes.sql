-- Fixes reported by the Supabase Performance Advisor (2026-10-16):
--   * unindexed_foreign_keys: one covering index per foreign key, columns in key order.
--     Indexes made redundant by a covering one are replaced.
--   * multiple_permissive_policies on profiles: one SELECT policy instead of two.
-- The Security Advisor warnings about SECURITY DEFINER functions callable by
-- authenticated / anon are intentional (RPC architecture, every function checks the role
-- first; get_public_catalog is public by design) and documented in docs/DECISIONS.md.

-- Composite foreign keys (x_id, shop_id) ------------------------------------------------

drop index if exists public.lots_reception_idx;
create index lots_reception_id_shop_id_idx on public.lots (reception_id, shop_id);
create index lots_product_id_shop_id_idx on public.lots (product_id, shop_id);
drop index if exists public.lots_supplier_idx;
create index lots_supplier_id_shop_id_idx on public.lots (supplier_id, shop_id);

create index products_category_id_shop_id_idx on public.products (category_id, shop_id);
create index product_photos_product_id_shop_id_idx on public.product_photos (product_id, shop_id);

create index receptions_supplier_id_shop_id_idx on public.receptions (supplier_id, shop_id);

create index expenses_supplier_id_shop_id_idx on public.expenses (supplier_id, shop_id);
create index expenses_reception_id_shop_id_idx on public.expenses (reception_id, shop_id);
create index expenses_return_id_shop_id_idx on public.expenses (return_id, shop_id);

drop index if exists public.sales_customer_idx;
create index sales_customer_id_shop_id_idx on public.sales (customer_id, shop_id);

drop index if exists public.sale_items_sale_idx;
create index sale_items_sale_id_shop_id_idx on public.sale_items (sale_id, shop_id);
drop index if exists public.sale_items_product_idx;
create index sale_items_product_id_shop_id_idx on public.sale_items (product_id, shop_id);

drop index if exists public.sale_item_allocations_item_idx;
create index sale_item_allocations_sale_item_id_shop_id_idx
  on public.sale_item_allocations (sale_item_id, shop_id);
drop index if exists public.sale_item_allocations_lot_idx;
create index sale_item_allocations_lot_id_shop_id_idx on public.sale_item_allocations (lot_id, shop_id);
drop index if exists public.sale_item_allocations_supplier_idx;
create index sale_item_allocations_supplier_id_shop_id_idx
  on public.sale_item_allocations (supplier_id, shop_id);

drop index if exists public.sale_payments_sale_idx;
create index sale_payments_sale_id_shop_id_idx on public.sale_payments (sale_id, shop_id);

create index returns_supplier_id_shop_id_idx on public.returns (supplier_id, shop_id);

drop index if exists public.return_items_return_idx;
create index return_items_return_id_shop_id_idx on public.return_items (return_id, shop_id);
create index return_items_lot_id_shop_id_idx on public.return_items (lot_id, shop_id);
create index return_items_product_id_shop_id_idx on public.return_items (product_id, shop_id);

create index supplier_payments_supplier_id_shop_id_idx
  on public.supplier_payments (supplier_id, shop_id);

-- shop_id alone (tables whose other indexes start with another column) ------------------

create index return_items_shop_id_idx on public.return_items (shop_id);
create index sale_payments_shop_id_idx on public.sale_payments (shop_id);

-- Authors (created_by / cancelled_by → auth.users) --------------------------------------

create index shops_created_by_idx on public.shops (created_by);
create index receptions_created_by_idx on public.receptions (created_by);
create index receptions_cancelled_by_idx on public.receptions (cancelled_by);
create index expenses_created_by_idx on public.expenses (created_by);
create index expenses_cancelled_by_idx on public.expenses (cancelled_by);
create index sales_created_by_fk_idx on public.sales (created_by);
create index sales_cancelled_by_idx on public.sales (cancelled_by);
create index sale_payments_created_by_idx on public.sale_payments (created_by);
create index returns_created_by_idx on public.returns (created_by);
create index returns_cancelled_by_idx on public.returns (cancelled_by);
create index supplier_payments_created_by_idx on public.supplier_payments (created_by);
create index supplier_payments_cancelled_by_idx on public.supplier_payments (cancelled_by);

-- profiles: a single SELECT policy ----------------------------------------------------------

drop policy "profiles: read own profile" on public.profiles;
drop policy "profiles: read shop mates" on public.profiles;
create policy "profiles: read own profile and shop mates" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_shop_with(id));
