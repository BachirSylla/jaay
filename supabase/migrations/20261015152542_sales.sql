-- Sales: a sale, its lines, the FIFO allocation of each line to lots (cost frozen per lot)
-- and its payments (kept apart from the sale to allow customer credit later).
-- Writes only through create_sale / cancel_sale.

create type public.sale_channel as enum ('whatsapp', 'instagram', 'facebook', 'tiktok', 'in_person', 'other');
create type public.payment_method as enum ('wave', 'orange_money', 'cash', 'other');

-- tables ---------------------------------------------------------------------------------

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  number integer not null,                                  -- sequential per shop
  customer_id uuid,
  customer_type public.customer_type not null default 'individual',
  channel public.sale_channel not null default 'in_person',
  sold_at timestamptz not null default now(),
  total_amount bigint not null check (total_amount >= 0),
  amount_paid bigint not null check (amount_paid >= 0),
  note text check (char_length(note) <= 500),
  status public.op_status not null default 'active',
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancel_reason text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (shop_id, number),
  unique (id, shop_id),
  foreign key (customer_id, shop_id) references public.customers (id, shop_id),
  constraint sales_fully_paid check (amount_paid = total_amount)   -- MVP: no customer credit
);
create index sales_shop_sold_at_idx on public.sales (shop_id, sold_at desc);
create index sales_customer_idx on public.sales (shop_id, customer_id);
create index sales_created_by_idx on public.sales (shop_id, created_by);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  sale_id uuid not null,
  product_id uuid not null,
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  line_total bigint generated always as (quantity * unit_price) stored,
  unique (id, shop_id),
  foreign key (sale_id, shop_id) references public.sales (id, shop_id) on delete cascade,
  foreign key (product_id, shop_id) references public.products (id, shop_id)
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (shop_id, product_id);

create table public.sale_item_allocations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  sale_item_id uuid not null,
  lot_id uuid not null,
  supplier_id uuid not null,
  quantity integer not null check (quantity > 0),
  unit_cost bigint not null check (unit_cost >= 0),          -- frozen at sale time
  foreign key (sale_item_id, shop_id) references public.sale_items (id, shop_id) on delete cascade,
  foreign key (lot_id, shop_id) references public.lots (id, shop_id),
  foreign key (supplier_id, shop_id) references public.suppliers (id, shop_id)
);
create index sale_item_allocations_item_idx on public.sale_item_allocations (sale_item_id);
create index sale_item_allocations_lot_idx on public.sale_item_allocations (lot_id);
create index sale_item_allocations_supplier_idx on public.sale_item_allocations (shop_id, supplier_id);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  sale_id uuid not null,
  method public.payment_method not null,
  amount bigint not null check (amount > 0),
  paid_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (sale_id, shop_id) references public.sales (id, shop_id) on delete cascade
);
create index sale_payments_sale_idx on public.sale_payments (sale_id);

-- RLS: owner/admin read every sale; a manager reads the sales they created. Lines and
-- payments follow the visibility of their sale. Allocations (costs): owner/admin only.

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_item_allocations enable row level security;
alter table public.sale_payments enable row level security;

revoke all on table public.sales, public.sale_items, public.sale_item_allocations,
  public.sale_payments from anon, authenticated;
grant select on table public.sales, public.sale_items, public.sale_item_allocations,
  public.sale_payments to authenticated;

create policy "sales: owner and admin read all, managers their own" on public.sales
  for select to authenticated
  using (
    public.has_shop_role(shop_id, '{owner,admin}')
    or (public.is_shop_member(shop_id) and created_by = (select auth.uid()))
  );

create policy "sale_items: follow the sale" on public.sale_items
  for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));

create policy "sale_payments: follow the sale" on public.sale_payments
  for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));

create policy "sale_item_allocations: owner and admin read" on public.sale_item_allocations
  for select to authenticated
  using (public.has_shop_role(shop_id, '{owner,admin}'));

-- create_sale ----------------------------------------------------------------------------

create function public.create_sale(
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
    select * from jsonb_to_recordset(p_items) as x (product_id uuid, quantity integer, unit_price bigint)
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

  -- Lines, consumed FIFO (oldest lot first); the lot cost is frozen on the allocation -----
  for v_item in
    select * from jsonb_to_recordset(p_items) as x (product_id uuid, quantity integer, unit_price bigint)
  loop
    insert into public.sale_items (shop_id, sale_id, product_id, quantity, unit_price)
    values (p_shop_id, v_sale.id, v_item.product_id, v_item.quantity, v_item.unit_price)
    returning id into v_sale_item_id;

    v_remaining := v_item.quantity;
    for v_lot in
      select l.id, l.supplier_id, l.unit_cost, l.qty_available
      from public.lots l
      join public.receptions r on r.id = l.reception_id
      where l.shop_id = p_shop_id
        and l.product_id = v_item.product_id
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
          'product_id', v_item.product_id, 'available', v_available
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

-- cancel_sale ----------------------------------------------------------------------------

create function public.cancel_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_shop_id uuid;
  v_status public.op_status;
  v_reason text := trim(coalesce(p_reason, ''));
  v_allocation record;
begin
  select shop_id into v_shop_id from public.sales where id = p_sale_id;
  if v_shop_id is null or not public.has_shop_role(v_shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 200 then
    raise exception 'REASON_REQUIRED';
  end if;

  select status into v_status from public.sales where id = p_sale_id for update;
  if v_status <> 'active' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  -- Give the quantities back to the lots they were taken from (lots locked in FIFO order).
  for v_allocation in
    select a.lot_id, sum(a.quantity)::integer as quantity
    from public.sale_item_allocations a
    join public.sale_items i on i.id = a.sale_item_id
    join public.lots l on l.id = a.lot_id
    where i.sale_id = p_sale_id
    group by a.lot_id, l.received_at
    order by l.received_at, a.lot_id
  loop
    perform 1 from public.lots where id = v_allocation.lot_id for update;
    update public.lots set qty_sold = qty_sold - v_allocation.quantity where id = v_allocation.lot_id;
  end loop;

  update public.sales
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_user_id, cancel_reason = v_reason
  where id = p_sale_id;
end;
$$;

-- cancel_reception: same rules, but lots are locked first and in FIFO order (like sales),
-- then the reception, so that a sale and a cancellation can never deadlock.

create or replace function public.cancel_reception(p_reception_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_shop_id uuid;
  v_status public.op_status;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  select shop_id into v_shop_id from public.receptions where id = p_reception_id;
  if v_shop_id is null or not public.has_shop_role(v_shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if char_length(v_reason) < 3 or char_length(v_reason) > 200 then
    raise exception 'REASON_REQUIRED';
  end if;

  perform 1 from public.lots
  where reception_id = p_reception_id
  order by received_at, id
  for update;

  select status into v_status from public.receptions where id = p_reception_id for update;
  if v_status <> 'active' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  if exists (
    select 1 from public.lots
    where reception_id = p_reception_id and (qty_sold > 0 or qty_returned > 0)
  ) then
    raise exception 'RECEPTION_HAS_MOVEMENTS';
  end if;

  update public.receptions
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_user_id, cancel_reason = v_reason
  where id = p_reception_id;

  update public.expenses
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_user_id, cancel_reason = v_reason
  where reception_id = p_reception_id and status = 'active';
end;
$$;

-- get_customer_stats ---------------------------------------------------------------------
-- Same visibility as sales: a manager only counts the sales they made.

create function public.get_customer_stats(p_shop_id uuid)
returns table (customer_id uuid, purchases integer, total_spent bigint, last_purchase_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_finance boolean;
  v_user_id uuid := (select auth.uid());
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_finance := public.has_shop_role(p_shop_id, '{owner,admin}');

  return query
  select s.customer_id, count(*)::integer, sum(s.total_amount)::bigint, max(s.sold_at)
  from public.sales s
  where s.shop_id = p_shop_id
    and s.status = 'active'
    and s.customer_id is not null
    and (v_finance or s.created_by = v_user_id)
  group by s.customer_id;
end;
$$;

revoke execute on function public.create_sale(uuid, uuid, public.customer_type, public.sale_channel,
  timestamptz, jsonb, jsonb, text) from public, anon;
revoke execute on function public.cancel_sale(uuid, text) from public, anon;
revoke execute on function public.get_customer_stats(uuid) from public, anon;
grant execute on function public.create_sale(uuid, uuid, public.customer_type, public.sale_channel,
  timestamptz, jsonb, jsonb, text) to authenticated;
grant execute on function public.cancel_sale(uuid, text) to authenticated;
grant execute on function public.get_customer_stats(uuid) to authenticated;
