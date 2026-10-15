-- Sales: FIFO example of DATA_MODEL §6, numbering, payments, stock checks, manager rules,
-- cancellation.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'x.owner@test.jaay', '{"full_name": "X Owner"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'x.manager@test.jaay', '{"full_name": "X Manager"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'y.owner@test.jaay', '{"full_name": "Y Owner"}');
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-sales-shop-x'),
  ('00000000-0000-0000-0000-0000000000f2', 'Shop Y', 'zz-sales-shop-y');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'manager'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a3', 'owner');
insert into public.suppliers (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000f1', 'Supplier X');
-- P: the FIFO example product. Q: everything else. Y: product of another shop.
insert into public.products (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000000f1', 'P'),
  ('00000000-0000-0000-0000-0000000009a2', '00000000-0000-0000-0000-0000000000f1', 'Q'),
  ('00000000-0000-0000-0000-0000000009a9', '00000000-0000-0000-0000-0000000000f2', 'Y');
insert into public.customers (id, shop_id, name, type) values
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-0000000000f1', 'Mariama', 'reseller'),
  ('00000000-0000-0000-0000-000000000ca9', '00000000-0000-0000-0000-0000000000f2', 'Other', 'individual');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

-- Lot A: 10 × 5 000 on Sept 1st; lot B: 10 × 5 500 on Sept 20th; Q: 20 × 4 000.
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-09-01 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 10, "unit_cost": 5000},
    {"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 20, "unit_cost": 4000}]', 0, null);
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-09-20 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 10, "unit_cost": 5500}]', 0, null);

-- FIFO example -----------------------------------------------------------------------------
select is(
  (public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'in_person',
     '2026-10-01 10:00+00',
     '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 12, "unit_price": 8000}]',
     '[{"method": "wave", "amount": 96000}]', null)).number,
  1, 'first sale of the shop gets number 1');

select results_eq(
  $$ select a.quantity, a.unit_cost from public.sale_item_allocations a
     join public.sale_items i on i.id = a.sale_item_id
     where i.product_id = '00000000-0000-0000-0000-0000000009a1' order by a.unit_cost $$,
  $$ values (10, 5000::bigint), (2, 5500::bigint) $$,
  'FIFO: 10 bags from lot A at 5 000, then 2 from lot B at 5 500');
select results_eq(
  $$ select qty_sold, qty_available from public.lots
     where product_id = '00000000-0000-0000-0000-0000000009a1' order by received_at $$,
  $$ values (10, 0), (2, 8) $$,
  'lot counters: A sold out, 8 bags left in B');
select results_eq(
  $$ select total_amount, amount_paid from public.sales where number = 1 $$,
  $$ values (96000::bigint, 96000::bigint) $$, 'revenue 96 000 F, paid in full');
select is(
  (select sum(a.quantity * a.unit_cost)::bigint from public.sale_item_allocations a),
  61000::bigint, 'cost of the sale: 61 000 F');
select is(
  (select (select sum(line_total) from public.sale_items)
        - (select sum(quantity * unit_cost) from public.sale_item_allocations))::bigint,
  35000::bigint, 'gross margin: 35 000 F');
select is(
  (select sum(a.quantity * a.unit_cost)::bigint
   from public.sale_item_allocations a
   join public.sale_items i on i.id = a.sale_item_id
   join public.sales s on s.id = i.sale_id
   where s.status = 'active' and a.supplier_id = '00000000-0000-0000-0000-0000000005a1'),
  61000::bigint, 'supplier balance: 61 000 F due');
select results_eq(
  $$ select qty_available from public.get_stock('00000000-0000-0000-0000-0000000000f1')
     where product_id = '00000000-0000-0000-0000-0000000009a1' $$,
  $$ values (8) $$, 'stock of P: 8 bags');

-- Numbering and split payment ---------------------------------------------------------------
select is(
  (public.create_sale('00000000-0000-0000-0000-0000000000f1',
     '00000000-0000-0000-0000-000000000ca1', 'reseller', 'whatsapp', now(),
     '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 2, "unit_price": 7000}]',
     '[{"method": "cash", "amount": 4000}, {"method": "orange_money", "amount": 10000}]', 'Livrée')).number,
  2, 'numbers are sequential per shop');
select results_eq(
  $$ select method::text, amount from public.sale_payments
     where sale_id = (select id from public.sales where number = 2) order by amount $$,
  $$ values ('cash', 4000::bigint), ('orange_money', 10000::bigint) $$,
  'a sale can be paid with two methods');

-- Refusals (nothing is written) --------------------------------------------------------------
select throws_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 9, "unit_price": 8000}]',
       '[{"method": "cash", "amount": 72000}]', null) $$,
  'P0001', 'INSUFFICIENT_STOCK', 'selling more than the stock is refused');
select results_eq(
  $$ select qty_sold from public.lots
     where product_id = '00000000-0000-0000-0000-0000000009a1' order by received_at $$,
  $$ values (10), (2) $$, 'a refused sale changes no lot');
select is((select count(*)::int from public.sales), 2, 'a refused sale creates no sale');
select is(
  (select next_sale_number from public.shops where id = '00000000-0000-0000-0000-0000000000f1'),
  3, 'a refused sale consumes no number');
select throws_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_price": 8000}]',
       '[{"method": "cash", "amount": 7000}]', null) $$,
  'P0001', 'PAYMENT_MISMATCH', 'payments must equal the total');
select throws_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_price": 8000}]',
       '[{"method": "cash", "amount": 4000}, {"method": "cash", "amount": 4000}]', null) $$,
  'P0001', 'PAYMENT_MISMATCH', 'a split payment uses two different methods');
select throws_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_price": 0}]',
       '[{"method": "cash", "amount": 1}]', null) $$,
  'P0001', 'INVALID_AMOUNT', 'a sale with a zero total is refused');
select throws_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a9", "quantity": 1, "unit_price": 8000}]',
       '[{"method": "cash", "amount": 8000}]', null) $$,
  'P0001', 'INVALID_PRODUCT', 'a product of another shop is refused');
select throws_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-000000000ca9', 'individual', 'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_price": 8000}]',
       '[{"method": "cash", "amount": 8000}]', null) $$,
  'P0001', 'INVALID_CUSTOMER', 'a customer of another shop is refused');
select throws_ok(
  $$ insert into public.sales (shop_id, number, total_amount, amount_paid)
     values ('00000000-0000-0000-0000-0000000000f1', 99, 0, 0) $$,
  '42501', null, 'sales are written through RPCs only');

-- Below the supplier price is allowed (RG6) ---------------------------------------------------
select lives_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'tiktok', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_price": 3000}]',
       '[{"method": "cash", "amount": 3000}]', 'Fin de série') $$,
  'a sale below the supplier price is allowed');

-- Manager -------------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}';
select lives_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'instagram', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_price": 8500}]',
       '[{"method": "wave", "amount": 8500}]', null) $$,
  'a manager records a sale');
select results_eq(
  $$ select total_amount from public.sales $$, $$ values (8500::bigint) $$,
  'a manager reads only their own sales');
select is((select count(*)::int from public.sale_items), 1, 'a manager reads only the lines of their sales');
select is((select count(*)::int from public.sale_payments), 1, 'a manager reads only the payments of their sales');
select is((select count(*)::int from public.sale_item_allocations), 0, 'a manager reads no allocation (costs)');
select throws_ok(
  $$ select public.cancel_sale((select id from public.sales limit 1), 'Erreur de saisie') $$,
  '42501', 'FORBIDDEN', 'a manager cannot cancel a sale');

-- Cancellation of the FIFO sale ---------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select lives_ok(
  $$ select public.cancel_sale((select id from public.sales where number = 1), 'Client absent') $$,
  'owner cancels the FIFO sale');
select results_eq(
  $$ select qty_available from public.lots
     where product_id = '00000000-0000-0000-0000-0000000009a1' order by received_at $$,
  $$ values (10), (10) $$, 'lots A and B are back to 10 available each');
select is(
  (select coalesce(sum(a.quantity * a.unit_cost), 0)::bigint
   from public.sale_item_allocations a
   join public.sale_items i on i.id = a.sale_item_id
   join public.sales s on s.id = i.sale_id
   where s.status = 'active' and i.product_id = '00000000-0000-0000-0000-0000000009a1'),
  0::bigint, 'supplier balance for P is back to 0');
select throws_ok(
  $$ select public.cancel_sale((select id from public.sales where number = 1), 'Encore') $$,
  'P0001', 'ALREADY_CANCELLED', 'a sale is cancelled once');
select throws_ok(
  $$ select public.cancel_reception(
       (select id from public.receptions where received_at = '2026-09-01 10:00+00'), 'Erreur') $$,
  'P0001', 'RECEPTION_HAS_MOVEMENTS', 'a reception with sold bags cannot be cancelled');

-- Other shop ----------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a3", "role": "authenticated"}';
select is((select count(*)::int from public.sales), 0, 'Y owner reads no sale of X');

select * from finish();
rollback;
