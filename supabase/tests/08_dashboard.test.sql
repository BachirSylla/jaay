-- get_dashboard / get_daily_sales: figures for owner/admin, restricted figures for managers.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'x.owner@test.jaay', '{"full_name": "X Owner"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'x.manager@test.jaay', '{"full_name": "X Manager"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'y.owner@test.jaay', '{"full_name": "Y Owner"}');
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-dash-shop-x');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d2', 'manager');
insert into public.suppliers (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000f1', 'Supplier');
-- P: plenty of stock. Q: low stock. R: never received (not "to watch").
insert into public.products (id, shop_id, name, low_stock_threshold) values
  ('00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000000f1', 'P', 2),
  ('00000000-0000-0000-0000-0000000009a2', '00000000-0000-0000-0000-0000000000f1', 'Q', 3),
  ('00000000-0000-0000-0000-0000000009a3', '00000000-0000-0000-0000-0000000000f1', 'R', 2);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-10-01 08:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 10, "unit_cost": 5000},
    {"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 2, "unit_cost": 4000}]', 0, null);
-- Owner: 2 × P at 8 000 in cash on WhatsApp.
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'whatsapp',
  '2026-10-10 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 2, "unit_price": 8000}]',
  '[{"method": "cash", "amount": 16000}]', null);
-- Owner: a sale outside the period, and a cancelled one inside.
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'whatsapp',
  '2026-09-01 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 1, "unit_price": 8000}]',
  '[{"method": "cash", "amount": 8000}]', null);
select public.cancel_sale(
  (public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'tiktok',
     '2026-10-11 10:00+00',
     '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 1, "unit_price": 99000}]',
     '[{"method": "wave", "amount": 99000}]', null)).id, 'Erreur');
insert into public.expenses (shop_id, category, amount, spent_at)
values ('00000000-0000-0000-0000-0000000000f1', 'delivery', 1500, '2026-10-10 12:00+00');
select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', 3000, 'wave', null, null);

-- Manager: 1 × P at 9 000 by Wave on Instagram.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}';
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'instagram',
  '2026-10-12 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 1, "unit_price": 9000}]',
  '[{"method": "wave", "amount": 9000}]', null);

-- Owner view of October 1st–15th ---------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
create temp table dash as
select public.get_dashboard('00000000-0000-0000-0000-0000000000f1',
  '2026-10-01 00:00+00', '2026-10-16 00:00+00') as d;

select is((select (d ->> 'revenue')::bigint from dash), 25000::bigint,
  'revenue: active sales of the period (cancelled and older ones excluded)');
select is((select (d ->> 'sales_count')::int from dash), 2, 'number of sales');
select is((select (d ->> 'bags')::int from dash), 3, 'bags sold');
select is((select (d ->> 'margin')::bigint from dash), 10000::bigint,
  'gross margin: 25 000 − 3 × 5 000');
select is((select (d ->> 'expenses')::bigint from dash), 1500::bigint, 'expenses of the period');
select is((select (d ->> 'net_profit')::bigint from dash), 8500::bigint,
  'net profit = margin − expenses');
select is(
  (select d -> 'by_payment' from dash),
  '[{"method": "cash", "amount": 16000}, {"method": "wave", "amount": 9000}]'::jsonb,
  'collections by payment method');
select is(
  (select jsonb_agg(c ->> 'channel' order by c ->> 'channel') from dash, jsonb_array_elements(d -> 'by_channel') c),
  '["instagram", "whatsapp"]'::jsonb, 'sales by channel');
select is(
  (select (d -> 'top_products' -> 0 ->> 'bags')::int from dash), 3, 'top product with its bags');
select is(
  (select jsonb_agg(x ->> 'name') from dash, jsonb_array_elements(d -> 'low_stock') x),
  '["Q"]'::jsonb, 'stock to watch: low products already received');
select is(
  (select (d -> 'supplier_balances' -> 0 ->> 'balance')::bigint from dash),
  17000::bigint, 'supplier balance: 4 bags sold at 5 000 − 3 000 paid');

select is(
  (public.get_dashboard('00000000-0000-0000-0000-0000000000f1',
     '2026-11-01 00:00+00', '2026-11-30 00:00+00') ->> 'revenue')::bigint,
  0::bigint, 'an empty period has zero revenue');
select results_eq(
  $$ select day::text, revenue from public.get_daily_sales(
       '00000000-0000-0000-0000-0000000000f1', '2026-10-10', '2026-10-12') $$,
  $$ values ('2026-10-10', 16000::bigint), ('2026-10-11', 0::bigint), ('2026-10-12', 9000::bigint) $$,
  'daily revenue, zero-filled, cancelled sales excluded');

-- Manager view ---------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}';
create temp table dash_manager as
select public.get_dashboard('00000000-0000-0000-0000-0000000000f1',
  '2026-10-01 00:00+00', '2026-10-16 00:00+00') as d;
grant all on dash_manager to public;

select is((select (d ->> 'revenue')::bigint from dash_manager), 9000::bigint,
  'a manager only counts their own sales');
select is((select d -> 'margin' from dash_manager), 'null'::jsonb, 'no margin for a manager');
select is((select d -> 'net_profit' from dash_manager), 'null'::jsonb, 'no net profit for a manager');
select is((select d -> 'expenses' from dash_manager), 'null'::jsonb, 'no expense total for a manager');
select is((select d ? 'supplier_balances' from dash_manager), false, 'no supplier balance for a manager');
select results_eq(
  $$ select revenue from public.get_daily_sales(
       '00000000-0000-0000-0000-0000000000f1', '2026-10-10', '2026-10-12') $$,
  $$ values (0::bigint), (0::bigint), (9000::bigint) $$,
  'daily revenue of a manager: own sales only');

-- Non-member -----------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d3", "role": "authenticated"}';
select throws_ok(
  $$ select public.get_dashboard('00000000-0000-0000-0000-0000000000f1', now() - interval '1 day', now()) $$,
  '42501', 'FORBIDDEN', 'get_dashboard refuses non-members');

select * from finish();
rollback;
