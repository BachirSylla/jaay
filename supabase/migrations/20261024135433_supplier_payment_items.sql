-- Supplier payments say which sold bags they pay for.
--
-- A payment line points to a sale allocation (bags of one sale line taken from this supplier's
-- lots, at the frozen supplier price). A bag is paid in full or not at all; the part of a payment
-- not tied to bags is an advance ("acompte"). The supplier balance is unchanged: due minus paid.

alter table public.sale_item_allocations add constraint sale_item_allocations_id_shop_id_key
  unique (id, shop_id);

create table public.supplier_payment_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  payment_id uuid not null,
  allocation_id uuid not null,
  quantity integer not null check (quantity > 0),
  -- quantity × supplier price of the allocation, frozen.
  amount bigint not null check (amount >= 0),
  foreign key (payment_id, shop_id) references public.supplier_payments (id, shop_id) on delete cascade,
  foreign key (allocation_id, shop_id) references public.sale_item_allocations (id, shop_id)
);
create index supplier_payment_items_shop_id_idx on public.supplier_payment_items (shop_id);
create index supplier_payment_items_payment_id_shop_id_idx
  on public.supplier_payment_items (payment_id, shop_id);
create index supplier_payment_items_allocation_id_shop_id_idx
  on public.supplier_payment_items (allocation_id, shop_id);

alter table public.supplier_payment_items enable row level security;
revoke all on table public.supplier_payment_items from anon, authenticated;
grant select on table public.supplier_payment_items to authenticated;
-- Written by create_supplier_payment only; read like the payments (owner/admin).
create policy "supplier_payment_items: owner and admin read" on public.supplier_payment_items
  for select to authenticated using (public.has_shop_role(shop_id, '{owner,admin}'));

-- create_supplier_payment: optional bags paid -------------------------------------------------
drop function public.create_supplier_payment(uuid, uuid, bigint, public.payment_method, timestamptz, text);
create function public.create_supplier_payment(
  p_shop_id uuid,
  p_supplier_id uuid,
  p_amount bigint,
  p_method public.payment_method,
  p_paid_at timestamptz default null,
  p_note text default null,
  -- [{allocation_id, quantity}]: sold bags this payment pays for (in full).
  p_items jsonb default null
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
  v_item record;
  v_allocation record;
  v_paid_already integer;
  v_items_total bigint := 0;
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
  if p_items is not null and (jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500) then
    raise exception 'EMPTY_ITEMS';
  end if;

  insert into public.supplier_payments (shop_id, supplier_id, amount, method, paid_at, note, created_by)
  values (p_shop_id, p_supplier_id, p_amount, p_method, v_paid_at, v_note, (select auth.uid()))
  returning id into v_payment_id;

  for v_item in
    select x.allocation_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as x (allocation_id uuid, quantity integer)
    group by x.allocation_id
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'INVALID_QUANTITY';
    end if;
    -- The allocation row lock serializes two payments of the same bags.
    select a.id, a.quantity, a.unit_cost into v_allocation
    from public.sale_item_allocations a
    join public.sale_items i on i.id = a.sale_item_id
    join public.sales s on s.id = i.sale_id
    where a.id = v_item.allocation_id
      and a.shop_id = p_shop_id
      and a.supplier_id = p_supplier_id
      and s.status = 'active'
    for update of a;
    if v_allocation.id is null then
      raise exception 'INVALID_ITEM';
    end if;

    select coalesce(sum(pi.quantity), 0)::integer into v_paid_already
    from public.supplier_payment_items pi
    join public.supplier_payments p on p.id = pi.payment_id
    where pi.allocation_id = v_allocation.id and p.status = 'active';
    if v_paid_already + v_item.quantity > v_allocation.quantity then
      raise exception 'ALREADY_PAID';
    end if;

    insert into public.supplier_payment_items (shop_id, payment_id, allocation_id, quantity, amount)
    values (
      p_shop_id, v_payment_id, v_allocation.id, v_item.quantity,
      v_item.quantity * v_allocation.unit_cost
    );
    v_items_total := v_items_total + v_item.quantity * v_allocation.unit_cost;
  end loop;

  -- The bags chosen cannot cost more than the payment; the rest is an advance.
  if v_items_total > p_amount then
    raise exception 'PAYMENT_MISMATCH';
  end if;

  return v_payment_id;
end;
$$;
revoke execute on function public.create_supplier_payment(
  uuid, uuid, bigint, public.payment_method, timestamptz, text, jsonb
) from public, anon;
grant execute on function public.create_supplier_payment(
  uuid, uuid, bigint, public.payment_method, timestamptz, text, jsonb
) to authenticated;
