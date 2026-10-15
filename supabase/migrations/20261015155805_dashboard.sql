-- Dashboard and reports. Same visibility as sales: a manager only counts the sales they
-- made and never gets a cost, a margin, an expense total or a supplier balance.

create function public.get_dashboard(p_shop_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_finance boolean;
  v_result jsonb;
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_finance := public.has_shop_role(p_shop_id, '{owner,admin}');

  with s as (
    select x.id, x.total_amount, x.channel
    from public.sales x
    where x.shop_id = p_shop_id
      and x.status = 'active'
      and x.sold_at >= p_from and x.sold_at < p_to
      and (v_finance or x.created_by = v_user_id)
  ),
  items as (
    select i.id, i.product_id, i.quantity, i.line_total
    from public.sale_items i join s on s.id = i.sale_id
  ),
  costs as (
    select coalesce(sum(a.quantity * a.unit_cost), 0)::bigint as cost
    from public.sale_item_allocations a join items on items.id = a.sale_item_id
  ),
  totals as (
    select coalesce(sum(s.total_amount), 0)::bigint as revenue, count(*)::integer as sales_count
    from s
  ),
  spent as (
    select coalesce(sum(e.amount), 0)::bigint as expenses
    from public.expenses e
    where e.shop_id = p_shop_id and e.status = 'active'
      and e.spent_at >= p_from and e.spent_at < p_to
  ),
  stock as (
    select p.id, p.name, p.color, p.low_stock_threshold, st.qty_available
    from public.get_stock(p_shop_id) st
    join public.products p on p.id = st.product_id
    where p.archived_at is null
      and st.is_low
      -- only products that were received at least once
      and exists (
        select 1 from public.lots l join public.receptions r on r.id = l.reception_id
        where l.product_id = p.id and r.status = 'active'
      )
  )
  select jsonb_build_object(
    'revenue', totals.revenue,
    'sales_count', totals.sales_count,
    'bags', coalesce((select sum(items.quantity) from items), 0),
    'by_channel', coalesce((
      select jsonb_agg(jsonb_build_object('channel', c.channel, 'amount', c.amount, 'count', c.n)
                       order by c.amount desc)
      from (select s.channel, sum(s.total_amount) as amount, count(*) as n from s group by s.channel) c
    ), '[]'::jsonb),
    'by_payment', coalesce((
      select jsonb_agg(jsonb_build_object('method', m.method, 'amount', m.amount) order by m.amount desc)
      from (
        select p.method, sum(p.amount) as amount
        from public.sale_payments p join s on s.id = p.sale_id
        group by p.method
      ) m
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object(
               'product_id', t.product_id, 'name', t.name, 'bags', t.bags, 'revenue', t.revenue)
             order by t.bags desc, t.revenue desc)
      from (
        select items.product_id, pr.name, sum(items.quantity) as bags, sum(items.line_total) as revenue
        from items join public.products pr on pr.id = items.product_id
        group by items.product_id, pr.name
        order by sum(items.quantity) desc, sum(items.line_total) desc
        limit 5
      ) t
    ), '[]'::jsonb),
    'low_stock', coalesce((
      select jsonb_agg(jsonb_build_object(
               'product_id', ls.id, 'name', ls.name, 'color', ls.color,
               'available', ls.qty_available, 'threshold', ls.low_stock_threshold)
             order by ls.qty_available, ls.name)
      from (select * from stock order by stock.qty_available, stock.name limit 8) ls
    ), '[]'::jsonb),
    'cost', case when v_finance then costs.cost end,
    'margin', case when v_finance then totals.revenue - costs.cost end,
    'expenses', case when v_finance then spent.expenses end,
    'net_profit', case when v_finance then totals.revenue - costs.cost - spent.expenses end
  )
  into v_result
  from totals, costs, spent;

  -- Supplier balances: computed only for owner/admin (the function refuses managers).
  if v_finance then
    v_result := v_result || jsonb_build_object('supplier_balances', coalesce((
      select jsonb_agg(jsonb_build_object(
               'supplier_id', b.supplier_id, 'name', sp.name, 'balance', b.balance)
             order by b.balance desc)
      from public.get_supplier_balances(p_shop_id) b
      join public.suppliers sp on sp.id = b.supplier_id
      where b.balance <> 0
    ), '[]'::jsonb));
  end if;

  return v_result;
end;
$$;

-- Revenue per day (Africa/Dakar), zero-filled, for the sales chart.
create function public.get_daily_sales(p_shop_id uuid, p_from date, p_to date)
returns table (day date, revenue bigint, sales_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_finance boolean;
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 400 then
    raise exception 'INVALID_DATE';
  end if;
  v_finance := public.has_shop_role(p_shop_id, '{owner,admin}');

  return query
  select d.day::date,
         coalesce(sum(x.total_amount), 0)::bigint,
         count(x.id)::integer
  from generate_series(p_from, p_to, interval '1 day') as d (day)
  left join public.sales x
    on x.shop_id = p_shop_id
   and x.status = 'active'
   and (x.sold_at at time zone 'Africa/Dakar')::date = d.day::date
   and (v_finance or x.created_by = v_user_id)
  group by d.day
  order by d.day;
end;
$$;

revoke execute on function public.get_dashboard(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.get_daily_sales(uuid, date, date) from public, anon;
grant execute on function public.get_dashboard(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_daily_sales(uuid, date, date) to authenticated;
