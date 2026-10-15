-- Stock: create_reception, cancel_reception, get_stock, cost visibility.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'x.owner@test.jaay', '{"full_name": "X Owner"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'x.manager@test.jaay', '{"full_name": "X Manager"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'y.owner@test.jaay', '{"full_name": "Y Owner"}');
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-stock-shop-x'),
  ('00000000-0000-0000-0000-0000000000f2', 'Shop Y', 'zz-stock-shop-y');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e2', 'manager'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e3', 'owner');
insert into public.suppliers (id, shop_id, name, archived_at) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000f1', 'Supplier X', null),
  ('00000000-0000-0000-0000-0000000005a3', '00000000-0000-0000-0000-0000000000f1', 'Old supplier', now()),
  ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000000f2', 'Supplier Y', null);
insert into public.products (id, shop_id, name, low_stock_threshold) values
  ('00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000000f1', 'Cabas', 2),
  ('00000000-0000-0000-0000-0000000009a3', '00000000-0000-0000-0000-0000000000f1', 'Pochette', 2),
  ('00000000-0000-0000-0000-0000000009a2', '00000000-0000-0000-0000-0000000000f2', 'Product Y', 2);

-- X owner receives 10 Cabas at 5 000 and 1 Pochette at 3 000, delivery 2 000 ----------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';

select lives_ok(
  $$ select public.create_reception(
       '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000005a1',
       '2026-09-01 10:00+00',
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 10, "unit_cost": 5000},
         {"product_id": "00000000-0000-0000-0000-0000000009a3", "quantity": 1, "unit_cost": 3000}]',
       2000, 'Premier dépôt') $$,
  'owner records a reception');

select results_eq(
  $$ select product_id::text, qty_received, unit_cost, supplier_id::text, received_at
     from public.lots order by unit_cost desc $$,
  $$ values ('00000000-0000-0000-0000-0000000009a1', 10, 5000::bigint,
             '00000000-0000-0000-0000-0000000005a1', '2026-09-01 10:00+00'::timestamptz),
            ('00000000-0000-0000-0000-0000000009a3', 1, 3000::bigint,
             '00000000-0000-0000-0000-0000000005a1', '2026-09-01 10:00+00'::timestamptz) $$,
  'one lot per line, supplier and date copied from the reception');

select results_eq(
  $$ select category::text, amount, supplier_id::text, status::text from public.expenses $$,
  $$ values ('delivery', 2000::bigint, '00000000-0000-0000-0000-0000000005a1', 'active') $$,
  'the delivery fee is recorded as a delivery expense');

select results_eq(
  $$ select product_id::text, qty_available, is_low
     from public.get_stock('00000000-0000-0000-0000-0000000000f1') order by product_id $$,
  $$ values ('00000000-0000-0000-0000-0000000009a1', 10, false),
            ('00000000-0000-0000-0000-0000000009a3', 1, true) $$,
  'get_stock: available quantities and low-stock flag');

select results_eq(
  $$ select total_qty, total_cost, delivery_fee
     from public.get_receptions('00000000-0000-0000-0000-0000000000f1') $$,
  $$ values (11, 53000::bigint, 2000::bigint) $$,
  'get_receptions: totals with cost for the owner');

-- Validation ------------------------------------------------------------------------------
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now(), '[]', 0, null) $$,
  'P0001', 'EMPTY_ITEMS', 'a reception needs at least one line');
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a3', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 1, "unit_cost": 1}]', 0, null) $$,
  'P0001', 'INVALID_SUPPLIER', 'an archived supplier is refused');
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a2', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 1, "unit_cost": 1}]', 0, null) $$,
  'P0001', 'INVALID_SUPPLIER', 'a supplier of another shop is refused');
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_cost": 1}]', 0, null) $$,
  'P0001', 'INVALID_PRODUCT', 'a product of another shop is refused');
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 0, "unit_cost": 1}]', 0, null) $$,
  'P0001', 'INVALID_QUANTITY', 'a zero quantity is refused');
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 1, "unit_cost": -5}]', 0, null) $$,
  'P0001', 'INVALID_AMOUNT', 'a negative cost is refused');
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now() + interval '3 days',
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 1, "unit_cost": 1}]', 0, null) $$,
  'P0001', 'INVALID_DATE', 'a reception in the future is refused');
select is(
  (select count(*)::int from public.lots), 2, 'failed receptions leave no lot behind');

-- Direct writes are refused ----------------------------------------------------------------
select throws_ok(
  $$ insert into public.receptions (shop_id, supplier_id)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000005a1') $$,
  '42501', null, 'receptions are written through RPCs only');
select throws_ok(
  $$ update public.lots set qty_sold = 5 $$,
  '42501', null, 'lots are written through RPCs only');
select throws_ok(
  $$ insert into public.expenses (shop_id, amount, status)
     values ('00000000-0000-0000-0000-0000000000f1', 100, 'cancelled') $$,
  '42501', null, 'the status of an expense cannot be set by the client');
select lives_ok(
  $$ insert into public.expenses (shop_id, category, amount, note)
     values ('00000000-0000-0000-0000-0000000000f1', 'packaging', 1500, 'Sachets') $$,
  'members record expenses directly');

-- Manager -----------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated"}';

select lives_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', '2026-09-20 10:00+00',
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 10, "unit_cost": 5500}]', 0, null) $$,
  'a manager records a reception');
select is((select count(*)::int from public.lots), 0, 'a manager cannot read lots');
select results_eq(
  $$ select qty_available from public.get_stock('00000000-0000-0000-0000-0000000000f1')
     where product_id = '00000000-0000-0000-0000-0000000009a1' $$,
  $$ values (20) $$, 'a manager reads stock through get_stock');
select is(
  (select count(*)::int from public.get_receptions('00000000-0000-0000-0000-0000000000f1')
   where total_cost is not null),
  0, 'get_receptions hides costs from managers');
select is(
  (select count(*)::int from public.get_reception_lines(
     (select id from public.receptions where received_at = '2026-09-20 10:00+00'))
   where unit_cost is not null),
  0, 'get_reception_lines hides costs from managers');
select throws_ok(
  $$ select public.cancel_reception(
       (select id from public.receptions where received_at = '2026-09-20 10:00+00'), 'Erreur') $$,
  '42501', 'FORBIDDEN', 'a manager cannot cancel a reception');

-- Other shop ------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e3", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.get_stock('00000000-0000-0000-0000-0000000000f1') $$,
  '42501', 'FORBIDDEN', 'get_stock refuses non-members');
select is((select count(*)::int from public.receptions), 0, 'Y owner reads no reception of X');

-- Cancellation ----------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';

select throws_ok(
  $$ select public.cancel_reception(
       (select id from public.receptions where received_at = '2026-09-01 10:00+00'), '') $$,
  'P0001', 'REASON_REQUIRED', 'a cancellation needs a reason');
select lives_ok(
  $$ select public.cancel_reception(
       (select id from public.receptions where received_at = '2026-09-01 10:00+00'),
       'Mauvais fournisseur') $$,
  'owner cancels a reception without movements');
select results_eq(
  $$ select qty_available from public.get_stock('00000000-0000-0000-0000-0000000000f1')
     order by product_id $$,
  $$ values (10), (0) $$, 'stock of a cancelled reception is no longer counted');
select is(
  (select status::text from public.expenses where reception_id is not null),
  'cancelled', 'the delivery expense is cancelled with the reception');
select throws_ok(
  $$ select public.cancel_reception(
       (select id from public.receptions where received_at = '2026-09-01 10:00+00'), 'Encore') $$,
  'P0001', 'ALREADY_CANCELLED', 'a reception is cancelled once');

-- A sold lot blocks the cancellation (sales arrive in phase 4: simulated here) -------------
reset role;
update public.lots set qty_sold = 1
where reception_id = (select id from public.receptions where received_at = '2026-09-20 10:00+00');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';
select throws_ok(
  $$ select public.cancel_reception(
       (select id from public.receptions where received_at = '2026-09-20 10:00+00'), 'Erreur') $$,
  'P0001', 'RECEPTION_HAS_MOVEMENTS', 'a reception with sold bags cannot be cancelled');

select * from finish();
rollback;
