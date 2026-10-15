-- Stock: receptions (consignments received from a supplier) and their lots, plus expenses
-- (the delivery fee of a reception is recorded as an expense). Writes to receptions and lots
-- only go through RPCs; expenses accept direct inserts from members.

create type public.op_status as enum ('active', 'cancelled');
create type public.expense_category as enum ('delivery', 'packaging', 'advertising', 'other');

-- receptions -----------------------------------------------------------------------------

create table public.receptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  supplier_id uuid not null,
  received_at timestamptz not null default now(),
  note text check (char_length(note) <= 500),
  status public.op_status not null default 'active',
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancel_reason text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, shop_id),
  foreign key (supplier_id, shop_id) references public.suppliers (id, shop_id)
);
create index receptions_shop_idx on public.receptions (shop_id, received_at desc);

-- lots -----------------------------------------------------------------------------------

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  reception_id uuid not null,
  product_id uuid not null,
  supplier_id uuid not null,                                   -- copied from the reception
  received_at timestamptz not null,                            -- copied from the reception (FIFO order)
  qty_received integer not null check (qty_received > 0),
  qty_sold integer not null default 0 check (qty_sold >= 0),
  qty_returned integer not null default 0 check (qty_returned >= 0),
  unit_cost bigint not null check (unit_cost >= 0),
  qty_available integer generated always as (qty_received - qty_sold - qty_returned) stored,
  created_at timestamptz not null default now(),
  check (qty_received - qty_sold - qty_returned >= 0),
  unique (id, shop_id),
  foreign key (reception_id, shop_id) references public.receptions (id, shop_id),
  foreign key (product_id, shop_id) references public.products (id, shop_id),
  foreign key (supplier_id, shop_id) references public.suppliers (id, shop_id)
);
create index lots_fifo_idx on public.lots (shop_id, product_id, received_at, id)
  where qty_received - qty_sold - qty_returned > 0;
create index lots_reception_idx on public.lots (reception_id);
create index lots_supplier_idx on public.lots (shop_id, supplier_id);

-- expenses -------------------------------------------------------------------------------
-- return_id (delivery of a return to the supplier) is added with the returns table.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  category public.expense_category not null default 'delivery',
  amount bigint not null check (amount > 0),
  spent_at timestamptz not null default now(),
  supplier_id uuid,
  reception_id uuid,
  note text check (char_length(note) <= 500),
  status public.op_status not null default 'active',
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancel_reason text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, shop_id),
  foreign key (supplier_id, shop_id) references public.suppliers (id, shop_id),
  foreign key (reception_id, shop_id) references public.receptions (id, shop_id)
);
create index expenses_shop_idx on public.expenses (shop_id, spent_at desc);

-- RLS and privileges ---------------------------------------------------------------------

alter table public.receptions enable row level security;
alter table public.lots enable row level security;
alter table public.expenses enable row level security;

revoke all on table public.receptions, public.lots, public.expenses from anon, authenticated;

-- receptions: read by members (no cost on this table). Writes: RPC only.
grant select on table public.receptions to authenticated;
create policy "receptions: members read" on public.receptions
  for select to authenticated using (public.is_shop_member(shop_id));

-- lots carry the supplier price: owner/admin only. Managers read stock through get_stock.
grant select on table public.lots to authenticated;
create policy "lots: owner and admin read" on public.lots
  for select to authenticated using (public.has_shop_role(shop_id, '{owner,admin}'));

-- expenses: read and recorded by members. Only business columns are insertable: status,
-- author and cancellation are set by defaults and RPCs. Cancellation: RPC (owner/admin).
grant select on table public.expenses to authenticated;
grant insert (shop_id, category, amount, spent_at, supplier_id, reception_id, note)
  on table public.expenses to authenticated;
create policy "expenses: members read" on public.expenses
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "expenses: members insert" on public.expenses
  for insert to authenticated with check (public.is_shop_member(shop_id));

-- create_reception -----------------------------------------------------------------------

create function public.create_reception(
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
    select * from jsonb_to_recordset(p_items) as x (product_id uuid, quantity integer, unit_cost bigint)
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

    insert into public.lots (
      shop_id, reception_id, product_id, supplier_id, received_at, qty_received, unit_cost
    )
    values (
      p_shop_id, v_reception_id, v_item.product_id, p_supplier_id, v_received_at,
      v_item.quantity, v_item.unit_cost
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

-- cancel_reception -----------------------------------------------------------------------

create function public.cancel_reception(p_reception_id uuid, p_reason text)
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

  select status into v_status from public.receptions where id = p_reception_id for update;
  if v_status <> 'active' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  -- Lock the lots: a concurrent sale or return either finishes first (and the check below
  -- refuses the cancellation) or waits and then sees the reception cancelled.
  perform 1 from public.lots where reception_id = p_reception_id for update;
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

-- get_stock ------------------------------------------------------------------------------

-- Available quantity per product (active receptions only). No cost: readable by managers.
create function public.get_stock(p_shop_id uuid)
returns table (product_id uuid, qty_available integer, is_low boolean)
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
  select p.id,
         coalesce(s.qty, 0)::integer,
         coalesce(s.qty, 0) <= p.low_stock_threshold
  from public.products p
  left join (
    select l.product_id as pid, sum(l.qty_available) as qty
    from public.lots l
    join public.receptions r on r.id = l.reception_id
    where l.shop_id = p_shop_id and r.status = 'active'
    group by l.product_id
  ) s on s.pid = p.id
  where p.shop_id = p_shop_id;
end;
$$;

-- get_receptions / get_reception_lines -----------------------------------------------------
-- Costs are only returned to owner/admin; managers get null.

create function public.get_receptions(p_shop_id uuid)
returns table (
  id uuid,
  supplier_id uuid,
  supplier_name text,
  received_at timestamptz,
  note text,
  status public.op_status,
  cancel_reason text,
  total_qty integer,
  total_cost bigint,
  delivery_fee bigint,
  created_by_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_finance boolean;
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_finance := public.has_shop_role(p_shop_id, '{owner,admin}');

  return query
  select r.id, r.supplier_id, s.name, r.received_at, r.note, r.status, r.cancel_reason,
         coalesce(l.qty, 0)::integer,
         case when v_finance then coalesce(l.cost, 0)::bigint end,
         coalesce(e.fee, 0)::bigint,
         pr.full_name, r.created_at
  from public.receptions r
  join public.suppliers s on s.id = r.supplier_id
  left join lateral (
    select sum(x.qty_received) as qty, sum(x.qty_received * x.unit_cost) as cost
    from public.lots x where x.reception_id = r.id
  ) l on true
  left join lateral (
    select sum(x.amount) as fee
    from public.expenses x where x.reception_id = r.id and x.status = 'active'
  ) e on true
  left join public.profiles pr on pr.id = r.created_by
  where r.shop_id = p_shop_id
  order by r.received_at desc, r.created_at desc;
end;
$$;

create function public.get_reception_lines(p_reception_id uuid)
returns table (
  lot_id uuid,
  product_id uuid,
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
  select l.id, l.product_id, l.qty_received, l.qty_sold, l.qty_returned,
         case when v_finance then l.unit_cost end
  from public.lots l
  where l.reception_id = p_reception_id
  order by l.created_at, l.id;
end;
$$;

revoke execute on function public.create_reception(uuid, uuid, timestamptz, jsonb, bigint, text)
  from public, anon;
revoke execute on function public.cancel_reception(uuid, text) from public, anon;
revoke execute on function public.get_stock(uuid) from public, anon;
revoke execute on function public.get_receptions(uuid) from public, anon;
revoke execute on function public.get_reception_lines(uuid) from public, anon;
grant execute on function public.create_reception(uuid, uuid, timestamptz, jsonb, bigint, text)
  to authenticated;
grant execute on function public.cancel_reception(uuid, text) to authenticated;
grant execute on function public.get_stock(uuid) to authenticated;
grant execute on function public.get_receptions(uuid) to authenticated;
grant execute on function public.get_reception_lines(uuid) to authenticated;
