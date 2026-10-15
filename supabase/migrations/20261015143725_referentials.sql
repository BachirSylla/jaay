-- Reference data of a shop: suppliers, categories, products (+ photos), customers.
-- Nothing is deleted: rows are archived (archived_at). Product photos are the exception
-- (attachments, removed with their file).
--
-- Multi-shop integrity: every table has (id, shop_id) unique, and references between
-- shop-scoped rows use composite foreign keys including shop_id, so a row can never point
-- to a row of another shop, even with a known uuid.

create type public.customer_type as enum ('individual', 'reseller');

-- suppliers ------------------------------------------------------------------------------

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  address text check (char_length(address) <= 200),
  notes text check (char_length(notes) <= 1000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);
create index suppliers_shop_id_idx on public.suppliers (shop_id);

-- categories -----------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  unique (shop_id, name),
  unique (id, shop_id)
);

-- products -------------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(name) between 1 and 100),
  color text check (char_length(color) <= 40),
  description text check (char_length(description) <= 2000),
  suggested_price bigint check (suggested_price >= 0),
  reseller_price bigint check (reseller_price >= 0),
  low_stock_threshold integer not null default 2 check (low_stock_threshold >= 0),
  is_public boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, shop_id),
  foreign key (category_id, shop_id) references public.categories (id, shop_id)
);
create index products_shop_id_idx on public.products (shop_id, category_id);

create table public.product_photos (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  product_id uuid not null,
  storage_path text not null,           -- '<shop_id>/<product_id>/<uuid>.webp'
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (product_id, shop_id) references public.products (id, shop_id) on delete cascade,
  -- The file must live in the folder of its shop and product.
  check (storage_path like shop_id::text || '/' || product_id::text || '/%')
);
create index product_photos_product_idx on public.product_photos (product_id, position);
create index product_photos_shop_id_idx on public.product_photos (shop_id);

-- customers ------------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  type public.customer_type not null default 'individual',
  notes text check (char_length(notes) <= 1000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);
create index customers_shop_phone_idx on public.customers (shop_id, phone);

-- RLS and privileges ---------------------------------------------------------------------
-- Reads: every member. Writes: owner/admin, except customers (every member).
-- No delete (archiving), except product photos (owner/admin).
-- shop_id is never updatable: a row cannot move to another shop.

alter table public.suppliers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_photos enable row level security;
alter table public.customers enable row level security;

revoke all on table public.suppliers, public.categories, public.products,
  public.product_photos, public.customers from anon, authenticated;

grant select, insert on table public.suppliers to authenticated;
grant update (name, phone, address, notes, archived_at) on table public.suppliers to authenticated;

grant select, insert on table public.categories to authenticated;
grant update (name, position) on table public.categories to authenticated;

grant select, insert on table public.products to authenticated;
grant update (category_id, name, color, description, suggested_price, reseller_price,
  low_stock_threshold, is_public, archived_at) on table public.products to authenticated;

grant select, insert, delete on table public.product_photos to authenticated;
grant update (position) on table public.product_photos to authenticated;

grant select, insert on table public.customers to authenticated;
grant update (name, phone, type, notes, archived_at) on table public.customers to authenticated;

create policy "suppliers: members read" on public.suppliers
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "suppliers: owner and admin insert" on public.suppliers
  for insert to authenticated with check (public.has_shop_role(shop_id, '{owner,admin}'));
create policy "suppliers: owner and admin update" on public.suppliers
  for update to authenticated
  using (public.has_shop_role(shop_id, '{owner,admin}'))
  with check (public.has_shop_role(shop_id, '{owner,admin}'));

create policy "categories: members read" on public.categories
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "categories: owner and admin insert" on public.categories
  for insert to authenticated with check (public.has_shop_role(shop_id, '{owner,admin}'));
create policy "categories: owner and admin update" on public.categories
  for update to authenticated
  using (public.has_shop_role(shop_id, '{owner,admin}'))
  with check (public.has_shop_role(shop_id, '{owner,admin}'));

create policy "products: members read" on public.products
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "products: owner and admin insert" on public.products
  for insert to authenticated with check (public.has_shop_role(shop_id, '{owner,admin}'));
create policy "products: owner and admin update" on public.products
  for update to authenticated
  using (public.has_shop_role(shop_id, '{owner,admin}'))
  with check (public.has_shop_role(shop_id, '{owner,admin}'));

create policy "product_photos: members read" on public.product_photos
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "product_photos: owner and admin insert" on public.product_photos
  for insert to authenticated with check (public.has_shop_role(shop_id, '{owner,admin}'));
create policy "product_photos: owner and admin update" on public.product_photos
  for update to authenticated
  using (public.has_shop_role(shop_id, '{owner,admin}'))
  with check (public.has_shop_role(shop_id, '{owner,admin}'));
create policy "product_photos: owner and admin delete" on public.product_photos
  for delete to authenticated using (public.has_shop_role(shop_id, '{owner,admin}'));

create policy "customers: members read" on public.customers
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "customers: members insert" on public.customers
  for insert to authenticated with check (public.is_shop_member(shop_id));
create policy "customers: members update" on public.customers
  for update to authenticated
  using (public.is_shop_member(shop_id))
  with check (public.is_shop_member(shop_id));
