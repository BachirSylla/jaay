-- Phase 10: colors per model (product variants) and bag material.
--
-- A model ("Le Bureau") has colors ("Marron", "Noir"). Lots, sale lines and return lines point
-- to a color; FIFO now runs per color. variant_id null means "color not specified": the stock
-- recorded before this migration, and models without colors. Nothing existing is rewritten.

-- Material ----------------------------------------------------------------------------------
create type public.bag_material as enum ('leather', 'faux_leather', 'canvas', 'other');

alter table public.products add column material public.bag_material;
grant update (material) on table public.products to authenticated;

-- Colors ------------------------------------------------------------------------------------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  product_id uuid not null,
  color text not null check (char_length(btrim(color)) between 1 and 40),
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, shop_id),
  -- Lets lots / sale lines / return lines check that the color belongs to their model.
  unique (id, product_id),
  foreign key (product_id, shop_id) references public.products (id, shop_id) on delete cascade
);
create unique index product_variants_color_key
  on public.product_variants (product_id, lower(btrim(color)));
create index product_variants_shop_id_idx on public.product_variants (shop_id);
create index product_variants_product_id_shop_id_idx
  on public.product_variants (product_id, shop_id);

alter table public.product_variants enable row level security;
revoke all on table public.product_variants from anon, authenticated;
grant select, insert on table public.product_variants to authenticated;
grant update (color, position, archived_at) on table public.product_variants to authenticated;

create policy "product_variants: members read" on public.product_variants
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "product_variants: owner and admin insert" on public.product_variants
  for insert to authenticated with check (public.has_shop_role(shop_id, '{owner,admin}'));
create policy "product_variants: owner and admin update" on public.product_variants
  for update to authenticated
  using (public.has_shop_role(shop_id, '{owner,admin}'))
  with check (public.has_shop_role(shop_id, '{owner,admin}'));

-- Color on lots, sale lines and return lines (null = not specified) -------------------------
alter table public.lots add column variant_id uuid;
alter table public.lots add foreign key (variant_id, product_id)
  references public.product_variants (id, product_id);
create index lots_variant_id_product_id_idx on public.lots (variant_id, product_id);

alter table public.sale_items add column variant_id uuid;
alter table public.sale_items add foreign key (variant_id, product_id)
  references public.product_variants (id, product_id);
create index sale_items_variant_id_product_id_idx on public.sale_items (variant_id, product_id);

alter table public.return_items add column variant_id uuid;
alter table public.return_items add foreign key (variant_id, product_id)
  references public.product_variants (id, product_id);
create index return_items_variant_id_product_id_idx
  on public.return_items (variant_id, product_id);

-- Checks a line's color: required when the model has colors (receptions), must belong to it.
create function public.check_variant(
  p_product_id uuid,
  p_variant_id uuid,
  p_required boolean
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_variant_id is not null then
    if not exists (
      select 1 from public.product_variants v
      where v.id = p_variant_id and v.product_id = p_product_id
    ) then
      raise exception 'INVALID_VARIANT';
    end if;
  elsif p_required and exists (
    select 1 from public.product_variants v
    where v.product_id = p_product_id and v.archived_at is null
  ) then
    raise exception 'VARIANT_REQUIRED';
  end if;
end;
$$;
revoke execute on function public.check_variant(uuid, uuid, boolean) from public, anon, authenticated;

-- create_reception: one lot per model and color ----------------------------------------------
create or replace function public.create_reception(
  p_shop_id uuid,
  p_supplier_id uuid,
  p_received_at timestamptz,
  p_items jsonb,
  p_delivery_fee bigint default 0,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_received_at timestamptz := coalesce(p_received_at, now());
  v_note text := nullif(trim(p_note), '');
  v_reception_id uuid;
  v_item record;
begin
  -- Every member records receptions (managers included).
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.suppliers
    where id = p_supplier_id and shop_id = p_shop_id and archived_at is null
  ) then
    raise exception 'INVALID_SUPPLIER';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'EMPTY_ITEMS';
  end if;

  if v_received_at > now() + interval '1 day' then
    raise exception 'INVALID_DATE';
  end if;

  if coalesce(p_delivery_fee, 0) < 0 or coalesce(p_delivery_fee, 0) > 100000000 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if char_length(v_note) > 500 then
    raise exception 'INVALID_NOTE';
  end if;

  insert into public.receptions (shop_id, supplier_id, received_at, note, created_by)
  values (p_shop_id, p_supplier_id, v_received_at, v_note, v_user_id)
  returning id into v_reception_id;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x (product_id uuid, variant_id uuid, quantity integer, unit_cost bigint)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 10000 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if v_item.unit_cost is null or v_item.unit_cost < 0 or v_item.unit_cost > 100000000 then
      raise exception 'INVALID_AMOUNT';
    end if;
    if not exists (
      select 1 from public.products
      where id = v_item.product_id and shop_id = p_shop_id and archived_at is null
    ) then
      raise exception 'INVALID_PRODUCT';
    end if;
    -- A model with colors is always received color by color.
    perform public.check_variant(v_item.product_id, v_item.variant_id, true);

    insert into public.lots (
      shop_id, reception_id, product_id, variant_id, supplier_id, received_at,
      qty_received, unit_cost
    )
    values (
      p_shop_id, v_reception_id, v_item.product_id, v_item.variant_id, p_supplier_id,
      v_received_at, v_item.quantity, v_item.unit_cost
    );
  end loop;

  if coalesce(p_delivery_fee, 0) > 0 then
    insert into public.expenses (
      shop_id, category, amount, spent_at, supplier_id, reception_id, created_by
    )
    values (
      p_shop_id, 'delivery', p_delivery_fee, v_received_at, p_supplier_id, v_reception_id, v_user_id
    );
  end if;

  return v_reception_id;
end;
$$;

-- create_sale: FIFO within the chosen color (null = stock without color) ---------------------
create or replace function public.create_sale(
  p_shop_id uuid,
  p_customer_id uuid,
  p_customer_type public.customer_type,
  p_channel public.sale_channel,
  p_sold_at timestamptz,
  p_items jsonb,
  p_payments jsonb,
  p_note text default null
)
returns public.sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sold_at timestamptz := coalesce(p_sold_at, now());
  v_note text := nullif(trim(p_note), '');
  v_total bigint := 0;
  v_paid bigint := 0;
  v_number integer;
  v_sale public.sales;
  v_item record;
  v_payment record;
  v_lot record;
  v_sale_item_id uuid;
  v_remaining integer;
  v_take integer;
  v_available integer;
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Validation --------------------------------------------------------------------------
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'EMPTY_ITEMS';
  end if;
  if p_payments is null or jsonb_typeof(p_payments) <> 'array'
     or jsonb_array_length(p_payments) not between 1 and 2 then
    raise exception 'PAYMENT_MISMATCH';
  end if;
  if v_sold_at > now() + interval '1 day' then
    raise exception 'INVALID_DATE';
  end if;
  if char_length(v_note) > 500 then
    raise exception 'INVALID_NOTE';
  end if;
  if p_customer_id is not null and not exists (
    select 1 from public.customers where id = p_customer_id and shop_id = p_shop_id
  ) then
    raise exception 'INVALID_CUSTOMER';
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x (product_id uuid, variant_id uuid, quantity integer, unit_price bigint)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 1000 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if v_item.unit_price is null or v_item.unit_price < 0 or v_item.unit_price > 100000000 then
      raise exception 'INVALID_AMOUNT';
    end if;
    if not exists (
      select 1 from public.products
      where id = v_item.product_id and shop_id = p_shop_id and archived_at is null
    ) then
      raise exception 'INVALID_PRODUCT';
    end if;
    -- No color = the stock recorded without color (it may exist for a model with colors).
    perform public.check_variant(v_item.product_id, v_item.variant_id, false);
    v_total := v_total + v_item.quantity * v_item.unit_price;
  end loop;

  if (select count(distinct x.method) from jsonb_to_recordset(p_payments) as x (method text))
     <> jsonb_array_length(p_payments) then
    raise exception 'PAYMENT_MISMATCH';
  end if;
  for v_payment in
    select * from jsonb_to_recordset(p_payments) as x (method public.payment_method, amount bigint)
  loop
    if v_payment.method is null or v_payment.amount is null or v_payment.amount <= 0 then
      raise exception 'PAYMENT_MISMATCH';
    end if;
    v_paid := v_paid + v_payment.amount;
  end loop;
  -- A sale has a positive total; RG8: it is paid in full at sale time.
  if v_total <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if v_paid <> v_total then
    raise exception 'PAYMENT_MISMATCH';
  end if;

  -- Sequential number per shop (the row lock serializes concurrent sales of a shop) -------
  update public.shops
  set next_sale_number = next_sale_number + 1
  where id = p_shop_id
  returning next_sale_number - 1 into v_number;

  insert into public.sales (
    shop_id, number, customer_id, customer_type, channel, sold_at,
    total_amount, amount_paid, note, created_by
  )
  values (
    p_shop_id, v_number, p_customer_id, coalesce(p_customer_type, 'individual'),
    coalesce(p_channel, 'in_person'), v_sold_at, v_total, v_total, v_note, v_user_id
  )
  returning * into v_sale;

  -- Lines, consumed FIFO (oldest lot first) within the color; the lot cost is frozen ------
  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x (product_id uuid, variant_id uuid, quantity integer, unit_price bigint)
  loop
    insert into public.sale_items (shop_id, sale_id, product_id, variant_id, quantity, unit_price)
    values (
      p_shop_id, v_sale.id, v_item.product_id, v_item.variant_id, v_item.quantity,
      v_item.unit_price
    )
    returning id into v_sale_item_id;

    v_remaining := v_item.quantity;
    for v_lot in
      select l.id, l.supplier_id, l.unit_cost, l.qty_available
      from public.lots l
      join public.receptions r on r.id = l.reception_id
      where l.shop_id = p_shop_id
        and l.product_id = v_item.product_id
        and l.variant_id is not distinct from v_item.variant_id
        and r.status = 'active'
        and l.qty_received - l.qty_sold - l.qty_returned > 0
      order by l.received_at, l.id
      for update of l
      for share of r
    loop
      v_take := least(v_remaining, v_lot.qty_available);
      insert into public.sale_item_allocations (
        shop_id, sale_item_id, lot_id, supplier_id, quantity, unit_cost
      )
      values (p_shop_id, v_sale_item_id, v_lot.id, v_lot.supplier_id, v_take, v_lot.unit_cost);
      update public.lots set qty_sold = qty_sold + v_take where id = v_lot.id;
      v_remaining := v_remaining - v_take;
      exit when v_remaining = 0;
    end loop;

    if v_remaining > 0 then
      v_available := v_item.quantity - v_remaining;
      raise exception 'INSUFFICIENT_STOCK'
        using detail = jsonb_build_object(
          'product_id', v_item.product_id,
          'variant_id', v_item.variant_id,
          'available', v_available
        )::text;
    end if;
  end loop;

  for v_payment in
    select * from jsonb_to_recordset(p_payments) as x (method public.payment_method, amount bigint)
  loop
    insert into public.sale_payments (shop_id, sale_id, method, amount, paid_at, created_by)
    values (p_shop_id, v_sale.id, v_payment.method, v_payment.amount, v_sold_at, v_user_id);
  end loop;

  return v_sale;
end;
$$;

-- create_return: FIFO on the supplier's lots of that color -----------------------------------
create or replace function public.create_return(
  p_shop_id uuid,
  p_supplier_id uuid,
  p_returned_at timestamptz,
  p_items jsonb,
  p_delivery_fee bigint default 0,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_returned_at timestamptz := coalesce(p_returned_at, now());
  v_note text := nullif(trim(p_note), '');
  v_return_id uuid;
  v_item record;
  v_lot record;
  v_remaining integer;
  v_take integer;
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (select 1 from public.suppliers where id = p_supplier_id and shop_id = p_shop_id) then
    raise exception 'INVALID_SUPPLIER';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'EMPTY_ITEMS';
  end if;
  if v_returned_at > now() + interval '1 day' then
    raise exception 'INVALID_DATE';
  end if;
  if coalesce(p_delivery_fee, 0) < 0 or coalesce(p_delivery_fee, 0) > 100000000 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if char_length(v_note) > 500 then
    raise exception 'INVALID_NOTE';
  end if;

  insert into public.returns (shop_id, supplier_id, returned_at, note, created_by)
  values (p_shop_id, p_supplier_id, v_returned_at, v_note, v_user_id)
  returning id into v_return_id;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x (product_id uuid, variant_id uuid, quantity integer)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 10000 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if not exists (
      select 1 from public.products where id = v_item.product_id and shop_id = p_shop_id
    ) then
      raise exception 'INVALID_PRODUCT';
    end if;
    perform public.check_variant(v_item.product_id, v_item.variant_id, false);

    v_remaining := v_item.quantity;
    for v_lot in
      select l.id, l.qty_available
      from public.lots l
      join public.receptions r on r.id = l.reception_id
      where l.shop_id = p_shop_id
        and l.product_id = v_item.product_id
        and l.variant_id is not distinct from v_item.variant_id
        and l.supplier_id = p_supplier_id
        and r.status = 'active'
        and l.qty_received - l.qty_sold - l.qty_returned > 0
      order by l.received_at, l.id
      for update of l
      for share of r
    loop
      v_take := least(v_remaining, v_lot.qty_available);
      insert into public.return_items (shop_id, return_id, lot_id, product_id, variant_id, quantity)
      values (p_shop_id, v_return_id, v_lot.id, v_item.product_id, v_item.variant_id, v_take);
      update public.lots set qty_returned = qty_returned + v_take where id = v_lot.id;
      v_remaining := v_remaining - v_take;
      exit when v_remaining = 0;
    end loop;

    if v_remaining > 0 then
      raise exception 'INSUFFICIENT_STOCK'
        using detail = jsonb_build_object(
          'product_id', v_item.product_id,
          'variant_id', v_item.variant_id,
          'available', v_item.quantity - v_remaining
        )::text;
    end if;
  end loop;

  if coalesce(p_delivery_fee, 0) > 0 then
    insert into public.expenses (
      shop_id, category, amount, spent_at, supplier_id, return_id, created_by
    )
    values (
      p_shop_id, 'delivery', p_delivery_fee, v_returned_at, p_supplier_id, v_return_id, v_user_id
    );
  end if;

  return v_return_id;
end;
$$;

-- Stock per color (no cost: every member) ----------------------------------------------------
create function public.get_variant_stock(p_shop_id uuid)
returns table (product_id uuid, variant_id uuid, qty_available integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select l.product_id, l.variant_id, sum(l.qty_available)::integer
  from public.lots l
  join public.receptions r on r.id = l.reception_id
  where l.shop_id = p_shop_id and r.status = 'active'
  group by l.product_id, l.variant_id;
end;
$$;
revoke execute on function public.get_variant_stock(uuid) from public, anon;
grant execute on function public.get_variant_stock(uuid) to authenticated;

-- Supplier stock per color (returns form) ----------------------------------------------------
drop function public.get_supplier_stock(uuid);
create function public.get_supplier_stock(p_shop_id uuid)
returns table (supplier_id uuid, product_id uuid, variant_id uuid, qty_available integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select l.supplier_id, l.product_id, l.variant_id, sum(l.qty_available)::integer
  from public.lots l
  join public.receptions r on r.id = l.reception_id
  where l.shop_id = p_shop_id and r.status = 'active'
  group by l.supplier_id, l.product_id, l.variant_id
  having sum(l.qty_available) > 0;
end;
$$;
revoke execute on function public.get_supplier_stock(uuid) from public, anon;
grant execute on function public.get_supplier_stock(uuid) to authenticated;

-- Reception lines and supplier lots now carry their color ------------------------------------
drop function public.get_reception_lines(uuid);
create function public.get_reception_lines(p_reception_id uuid)
returns table (
  lot_id uuid,
  product_id uuid,
  variant_id uuid,
  qty_received integer,
  qty_sold integer,
  qty_returned integer,
  unit_cost bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_finance boolean;
begin
  select r.shop_id into v_shop_id from public.receptions r where r.id = p_reception_id;
  if v_shop_id is null or not public.is_shop_member(v_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_finance := public.has_shop_role(v_shop_id, '{owner,admin}');

  return query
  select l.id, l.product_id, l.variant_id, l.qty_received, l.qty_sold, l.qty_returned,
         case when v_finance then l.unit_cost end
  from public.lots l
  where l.reception_id = p_reception_id
  order by l.created_at, l.id;
end;
$$;
revoke execute on function public.get_reception_lines(uuid) from public, anon;
grant execute on function public.get_reception_lines(uuid) to authenticated;

drop function public.get_supplier_lots(uuid);
create function public.get_supplier_lots(p_supplier_id uuid)
returns table (
  lot_id uuid,
  reception_id uuid,
  product_id uuid,
  variant_id uuid,
  received_at timestamptz,
  qty_received integer,
  qty_sold integer,
  qty_returned integer,
  qty_available integer,
  unit_cost bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
begin
  select s.shop_id into v_shop_id from public.suppliers s where s.id = p_supplier_id;
  if v_shop_id is null or not public.has_shop_role(v_shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select l.id, l.reception_id, l.product_id, l.variant_id, l.received_at, l.qty_received,
         l.qty_sold, l.qty_returned, l.qty_available, l.unit_cost
  from public.lots l
  join public.receptions r on r.id = l.reception_id
  where l.supplier_id = p_supplier_id and r.status = 'active'
  order by l.received_at desc, l.id;
end;
$$;
revoke execute on function public.get_supplier_lots(uuid) from public, anon;
grant execute on function public.get_supplier_lots(uuid) to authenticated;

-- Spread the stock without color over the model's colors -------------------------------------
-- p_items = [{variant_id, quantity}]. Takes the oldest uncolored lots first. A lot fully
-- assigned to one color just gets the color; otherwise it is split: the color part becomes a
-- new lot of the same reception, date, supplier and cost, so FIFO, amounts due and history are
-- unchanged.
create function public.assign_stock_colors(p_product_id uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_item record;
  v_lot record;
  v_remaining integer;
  v_take integer;
begin
  select p.shop_id into v_shop_id from public.products p where p.id = p_product_id;
  if v_shop_id is null or not public.has_shop_role(v_shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'EMPTY_ITEMS';
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x (variant_id uuid, quantity integer)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 10000 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if v_item.variant_id is null or not exists (
      select 1 from public.product_variants v
      where v.id = v_item.variant_id and v.product_id = p_product_id and v.archived_at is null
    ) then
      raise exception 'INVALID_VARIANT';
    end if;

    v_remaining := v_item.quantity;
    for v_lot in
      select l.id, l.reception_id, l.supplier_id, l.received_at, l.unit_cost,
             l.qty_received, l.qty_sold, l.qty_returned, l.qty_available
      from public.lots l
      join public.receptions r on r.id = l.reception_id
      where l.product_id = p_product_id
        and l.variant_id is null
        and r.status = 'active'
        and l.qty_received - l.qty_sold - l.qty_returned > 0
      order by l.received_at, l.id
      for update of l
      for share of r
    loop
      v_take := least(v_remaining, v_lot.qty_available);
      if v_take = v_lot.qty_received then
        -- Untouched lot entirely of this color.
        update public.lots set variant_id = v_item.variant_id where id = v_lot.id;
      else
        update public.lots set qty_received = qty_received - v_take where id = v_lot.id;
        insert into public.lots (
          shop_id, reception_id, product_id, variant_id, supplier_id, received_at,
          qty_received, unit_cost
        )
        values (
          v_shop_id, v_lot.reception_id, p_product_id, v_item.variant_id, v_lot.supplier_id,
          v_lot.received_at, v_take, v_lot.unit_cost
        );
      end if;
      v_remaining := v_remaining - v_take;
      exit when v_remaining = 0;
    end loop;

    if v_remaining > 0 then
      raise exception 'INSUFFICIENT_STOCK'
        using detail = jsonb_build_object(
          'product_id', p_product_id, 'available', v_item.quantity - v_remaining
        )::text;
    end if;
  end loop;
end;
$$;
revoke execute on function public.assign_stock_colors(uuid, jsonb) from public, anon;
grant execute on function public.assign_stock_colors(uuid, jsonb) to authenticated;

-- Public catalog: material and the colors still in stock -------------------------------------
create or replace function public.get_public_catalog(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop public.shops;
begin
  select * into v_shop from public.shops where slug = p_slug and catalog_enabled;
  if v_shop.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'shop', jsonb_build_object(
      'name', v_shop.name,
      'slug', v_shop.slug,
      'logo_path', v_shop.logo_path,
      'whatsapp_phone', v_shop.whatsapp_phone,
      'show_prices', v_shop.show_public_prices
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'name', p.name,
               'color', p.color,
               'material', p.material,
               'colors', coalesce((
                 select jsonb_agg(v.color order by v.position, v.color)
                 from public.product_variants v
                 where v.product_id = p.id
                   and v.archived_at is null
                   and exists (
                     select 1
                     from public.lots l
                     join public.receptions r on r.id = l.reception_id
                     where l.variant_id = v.id and r.status = 'active'
                       and l.qty_received - l.qty_sold - l.qty_returned > 0
                   )
               ), '[]'::jsonb),
               'description', p.description,
               'category', c.name,
               'price', case when v_shop.show_public_prices then p.suggested_price end,
               'photos', coalesce((
                 select jsonb_agg(ph.storage_path order by ph.position, ph.id)
                 from public.product_photos ph where ph.product_id = p.id
               ), '[]'::jsonb)
             )
             order by c.position nulls last, p.name)
      from public.products p
      left join public.categories c on c.id = p.category_id
      where p.shop_id = v_shop.id
        and p.is_public
        and p.archived_at is null
        and exists (
          select 1
          from public.lots l
          join public.receptions r on r.id = l.reception_id
          where l.product_id = p.id and r.status = 'active'
            and l.qty_received - l.qty_sold - l.qty_returned > 0
        )
    ), '[]'::jsonb)
  );
end;
$$;
