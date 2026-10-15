-- Returns of unsold bags to the supplier, supplier payments, expense cancellation,
-- and the supplier balance / lots read functions.

-- returns --------------------------------------------------------------------------------

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  supplier_id uuid not null,
  returned_at timestamptz not null default now(),
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
create index returns_shop_idx on public.returns (shop_id, returned_at desc);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  return_id uuid not null,
  lot_id uuid not null,
  product_id uuid not null,
  quantity integer not null check (quantity > 0),
  foreign key (return_id, shop_id) references public.returns (id, shop_id) on delete cascade,
  foreign key (lot_id, shop_id) references public.lots (id, shop_id),
  foreign key (product_id, shop_id) references public.products (id, shop_id)
);
create index return_items_return_idx on public.return_items (return_id);

-- supplier payments ----------------------------------------------------------------------

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  supplier_id uuid not null,
  amount bigint not null check (amount > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default now(),
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
create index supplier_payments_shop_idx on public.supplier_payments (shop_id, supplier_id, paid_at desc);

-- expenses: delivery of a return -----------------------------------------------------------

alter table public.expenses add column return_id uuid;
alter table public.expenses
  add constraint expenses_return_id_shop_id_fkey
  foreign key (return_id, shop_id) references public.returns (id, shop_id);
grant insert (return_id) on table public.expenses to authenticated;

-- RLS ------------------------------------------------------------------------------------

alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.supplier_payments enable row level security;

revoke all on table public.returns, public.return_items, public.supplier_payments
  from anon, authenticated;
grant select on table public.returns, public.return_items, public.supplier_payments to authenticated;

-- Returns carry no cost: every member reads them (managers record returns).
create policy "returns: members read" on public.returns
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "return_items: members read" on public.return_items
  for select to authenticated using (public.is_shop_member(shop_id));
-- Money paid to suppliers: owner/admin only.
create policy "supplier_payments: owner and admin read" on public.supplier_payments
  for select to authenticated using (public.has_shop_role(shop_id, '{owner,admin}'));

-- create_return --------------------------------------------------------------------------
-- RG4: a return takes the bags from the lots of the chosen supplier, oldest first.

create function public.create_return(
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
    select * from jsonb_to_recordset(p_items) as x (product_id uuid, quantity integer)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 10000 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if not exists (
      select 1 from public.products where id = v_item.product_id and shop_id = p_shop_id
    ) then
      raise exception 'INVALID_PRODUCT';
    end if;

    v_remaining := v_item.quantity;
    for v_lot in
      select l.id, l.qty_available
      from public.lots l
      join public.receptions r on r.id = l.reception_id
      where l.shop_id = p_shop_id
        and l.product_id = v_item.product_id
        and l.supplier_id = p_supplier_id
        and r.status = 'active'
        and l.qty_received - l.qty_sold - l.qty_returned > 0
      order by l.received_at, l.id
      for update of l
      for share of r
    loop
      v_take := least(v_remaining, v_lot.qty_available);
      insert into public.return_items (shop_id, return_id, lot_id, product_id, quantity)
      values (p_shop_id, v_return_id, v_lot.id, v_item.product_id, v_take);
      update public.lots set qty_returned = qty_returned + v_take where id = v_lot.id;
      v_remaining := v_remaining - v_take;
      exit when v_remaining = 0;
    end loop;

    if v_remaining > 0 then
      raise exception 'INSUFFICIENT_STOCK'
        using detail = jsonb_build_object(
          'product_id', v_item.product_id, 'available', v_item.quantity - v_remaining
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

-- cancel_return --------------------------------------------------------------------------

create function public.cancel_return(p_return_id uuid, p_reason text)
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
  v_item record;
begin
  select shop_id into v_shop_id from public.returns where id = p_return_id;
  if v_shop_id is null or not public.has_shop_role(v_shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 200 then
    raise exception 'REASON_REQUIRED';
  end if;

  select status into v_status from public.returns where id = p_return_id for update;
  if v_status <> 'active' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  for v_item in
    select ri.lot_id, sum(ri.quantity)::integer as quantity
    from public.return_items ri
    join public.lots l on l.id = ri.lot_id
    where ri.return_id = p_return_id
    group by ri.lot_id, l.received_at
    order by l.received_at, ri.lot_id
  loop
    perform 1 from public.lots where id = v_item.lot_id for update;
    update public.lots set qty_returned = qty_returned - v_item.quantity where id = v_item.lot_id;
  end loop;

  update public.returns
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_user_id, cancel_reason = v_reason
  where id = p_return_id;

  update public.expenses
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_user_id, cancel_reason = v_reason
  where return_id = p_return_id and status = 'active';
end;
$$;

-- supplier payments ----------------------------------------------------------------------

create function public.create_supplier_payment(
  p_shop_id uuid,
  p_supplier_id uuid,
  p_amount bigint,
  p_method public.payment_method,
  p_paid_at timestamptz default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_paid_at timestamptz := coalesce(p_paid_at, now());
  v_note text := nullif(trim(p_note), '');
begin
  if not public.has_shop_role(p_shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id and shop_id = p_shop_id) then
    raise exception 'INVALID_SUPPLIER';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_method is null then
    raise exception 'PAYMENT_MISMATCH';
  end if;
  if v_paid_at > now() + interval '1 day' then
    raise exception 'INVALID_DATE';
  end if;
  if char_length(v_note) > 500 then
    raise exception 'INVALID_NOTE';
  end if;

  insert into public.supplier_payments (shop_id, supplier_id, amount, method, paid_at, note, created_by)
  values (p_shop_id, p_supplier_id, p_amount, p_method, v_paid_at, v_note, (select auth.uid()))
  returning id into v_payment_id;
  return v_payment_id;
end;
$$;

create function public.cancel_supplier_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_status public.op_status;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  select shop_id into v_shop_id from public.supplier_payments where id = p_payment_id;
  if v_shop_id is null or not public.has_shop_role(v_shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 200 then
    raise exception 'REASON_REQUIRED';
  end if;

  select status into v_status from public.supplier_payments where id = p_payment_id for update;
  if v_status <> 'active' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  update public.supplier_payments
  set status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()),
      cancel_reason = v_reason
  where id = p_payment_id;
end;
$$;

-- cancel_expense -------------------------------------------------------------------------
-- Delivery expenses of a reception or a return follow their operation and are cancelled
-- with it; the other expenses are cancelled here by owner/admin.

create function public.cancel_expense(p_expense_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense public.expenses;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  select * into v_expense from public.expenses where id = p_expense_id;
  if v_expense.id is null or not public.has_shop_role(v_expense.shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 200 then
    raise exception 'REASON_REQUIRED';
  end if;
  if v_expense.reception_id is not null or v_expense.return_id is not null then
    raise exception 'LINKED_EXPENSE';
  end if;

  update public.expenses
  set status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()),
      cancel_reason = v_reason
  where id = p_expense_id and status = 'active';
  if not found then
    raise exception 'ALREADY_CANCELLED';
  end if;
end;
$$;

-- Reads ----------------------------------------------------------------------------------

-- Per supplier: due = Σ allocations of active sales × frozen cost, paid = Σ active payments,
-- balance = due − paid (negative: advance paid by the shop, RG10), and bag counters.
create function public.get_supplier_balances(p_shop_id uuid)
returns table (
  supplier_id uuid,
  due bigint,
  paid bigint,
  balance bigint,
  qty_received integer,
  qty_sold integer,
  qty_returned integer,
  qty_in_stock integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_shop_role(p_shop_id, '{owner,admin}') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select s.id,
         coalesce(d.due, 0)::bigint,
         coalesce(p.paid, 0)::bigint,
         (coalesce(d.due, 0) - coalesce(p.paid, 0))::bigint,
         coalesce(q.received, 0)::integer,
         coalesce(q.sold, 0)::integer,
         coalesce(q.returned, 0)::integer,
         coalesce(q.in_stock, 0)::integer
  from public.suppliers s
  left join lateral (
    select sum(a.quantity * a.unit_cost) as due
    from public.sale_item_allocations a
    join public.sale_items i on i.id = a.sale_item_id
    join public.sales sa on sa.id = i.sale_id
    where a.supplier_id = s.id and sa.status = 'active'
  ) d on true
  left join lateral (
    select sum(x.amount) as paid
    from public.supplier_payments x
    where x.supplier_id = s.id and x.status = 'active'
  ) p on true
  left join lateral (
    select sum(l.qty_received) as received, sum(l.qty_sold) as sold,
           sum(l.qty_returned) as returned, sum(l.qty_available) as in_stock
    from public.lots l
    join public.receptions r on r.id = l.reception_id
    where l.supplier_id = s.id and r.status = 'active'
  ) q on true
  where s.shop_id = p_shop_id;
end;
$$;

-- Lots of a supplier (active receptions), with costs: owner/admin only.
create function public.get_supplier_lots(p_supplier_id uuid)
returns table (
  lot_id uuid,
  reception_id uuid,
  product_id uuid,
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
  select l.id, l.reception_id, l.product_id, l.received_at, l.qty_received, l.qty_sold,
         l.qty_returned, l.qty_available, l.unit_cost
  from public.lots l
  join public.receptions r on r.id = l.reception_id
  where l.supplier_id = p_supplier_id and r.status = 'active'
  order by l.received_at desc, l.id;
end;
$$;

-- Bags available per supplier and product, without cost: lets every member prepare a return.
create function public.get_supplier_stock(p_shop_id uuid)
returns table (supplier_id uuid, product_id uuid, qty_available integer)
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
  select l.supplier_id, l.product_id, sum(l.qty_available)::integer
  from public.lots l
  join public.receptions r on r.id = l.reception_id
  where l.shop_id = p_shop_id and r.status = 'active'
  group by l.supplier_id, l.product_id
  having sum(l.qty_available) > 0;
end;
$$;

revoke execute on function public.create_return(uuid, uuid, timestamptz, jsonb, bigint, text) from public, anon;
revoke execute on function public.cancel_return(uuid, text) from public, anon;
revoke execute on function public.create_supplier_payment(uuid, uuid, bigint, public.payment_method, timestamptz, text) from public, anon;
revoke execute on function public.cancel_supplier_payment(uuid, text) from public, anon;
revoke execute on function public.cancel_expense(uuid, text) from public, anon;
revoke execute on function public.get_supplier_balances(uuid) from public, anon;
revoke execute on function public.get_supplier_lots(uuid) from public, anon;
revoke execute on function public.get_supplier_stock(uuid) from public, anon;
grant execute on function public.create_return(uuid, uuid, timestamptz, jsonb, bigint, text) to authenticated;
grant execute on function public.cancel_return(uuid, text) to authenticated;
grant execute on function public.create_supplier_payment(uuid, uuid, bigint, public.payment_method, timestamptz, text) to authenticated;
grant execute on function public.cancel_supplier_payment(uuid, text) to authenticated;
grant execute on function public.cancel_expense(uuid, text) to authenticated;
grant execute on function public.get_supplier_balances(uuid) to authenticated;
grant execute on function public.get_supplier_lots(uuid) to authenticated;
grant execute on function public.get_supplier_stock(uuid) to authenticated;
