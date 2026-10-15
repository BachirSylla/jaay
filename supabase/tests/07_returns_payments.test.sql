-- Returns (RG4, FIFO on the chosen supplier's lots), supplier payments and balances (RG9, RG10),
-- expense cancellation, manager rules.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'x.owner@test.jaay', '{"full_name": "X Owner"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'x.manager@test.jaay', '{"full_name": "X Manager"}');
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-returns-shop-x');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b2', 'manager');
-- Two suppliers confide the same product P.
insert into public.suppliers (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000f1', 'Supplier A'),
  ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000000f1', 'Supplier B');
insert into public.products (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000000f1', 'P');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';

-- A: 5 × 5 000 (Sept 1st) then 5 × 5 200 (Sept 10th). B: 5 × 6 000 (Sept 5th).
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-09-01 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 5, "unit_cost": 5000}]', 0, null);
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a2', '2026-09-05 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 5, "unit_cost": 6000}]', 0, null);
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-09-10 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 5, "unit_cost": 5200}]', 0, null);

-- Sale of 7 bags (FIFO across suppliers: A 5 @5 000, B 2 @6 000) -------------------------------
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'in_person',
  '2026-10-01 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 7, "unit_price": 9000}]',
  '[{"method": "cash", "amount": 63000}]', null);

select results_eq(
  $$ select supplier_id::text, due, paid, balance from public.get_supplier_balances(
       '00000000-0000-0000-0000-0000000000f1') order by supplier_id $$,
  $$ values ('00000000-0000-0000-0000-0000000005a1', 25000::bigint, 0::bigint, 25000::bigint),
            ('00000000-0000-0000-0000-0000000005a2', 12000::bigint, 0::bigint, 12000::bigint) $$,
  'balances: each supplier is owed the frozen cost of its sold bags');

-- Return to supplier A: takes A's lots only, oldest first --------------------------------------
select lives_ok(
  $$ select public.create_return('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', '2026-10-05 10:00+00',
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 3}]', 1500, 'Fin de saison') $$,
  'a return to supplier A is recorded');
select results_eq(
  $$ select l.unit_cost, l.qty_returned from public.lots l order by l.received_at $$,
  $$ values (5000::bigint, 0), (6000::bigint, 0), (5200::bigint, 3) $$,
  'the return only takes bags from supplier A''s lots (the sold-out lot is skipped)');
select results_eq(
  $$ select category::text, amount, supplier_id::text from public.expenses where return_id is not null $$,
  $$ values ('delivery', 1500::bigint, '00000000-0000-0000-0000-0000000005a1') $$,
  'the delivery fee of a return is recorded as an expense');
select throws_ok(
  $$ select public.create_return('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 3}]', 0, null) $$,
  'P0001', 'INSUFFICIENT_STOCK', 'returning more than the supplier''s stock is refused (2 left)');
select results_eq(
  $$ select qty_in_stock, qty_received, qty_sold, qty_returned from public.get_supplier_balances(
       '00000000-0000-0000-0000-0000000000f1') where supplier_id = '00000000-0000-0000-0000-0000000005a1' $$,
  $$ values (2, 10, 5, 3) $$, 'supplier counters: received, sold, returned, in stock');
select results_eq(
  $$ select qty_available from public.get_stock('00000000-0000-0000-0000-0000000000f1') $$,
  $$ values (5) $$, 'stock of P: 15 − 7 sold − 3 returned');

-- Supplier payments, balance before/after, advance (RG10) --------------------------------------
select lives_ok(
  $$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 20000, 'wave', '2026-10-06 10:00+00', 'Acompte') $$,
  'owner pays supplier A');
select results_eq(
  $$ select due, paid, balance from public.get_supplier_balances('00000000-0000-0000-0000-0000000000f1')
     where supplier_id = '00000000-0000-0000-0000-0000000005a1' $$,
  $$ values (25000::bigint, 20000::bigint, 5000::bigint) $$, 'balance after a partial payment');
select lives_ok(
  $$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 8000, 'cash', null, null) $$,
  'owner pays more than due');
select is(
  (select balance from public.get_supplier_balances('00000000-0000-0000-0000-0000000000f1')
   where supplier_id = '00000000-0000-0000-0000-0000000005a1'),
  -3000::bigint, 'a negative balance is an advance paid by the shop');
select lives_ok(
  $$ select public.cancel_supplier_payment(
       (select id from public.supplier_payments where amount = 8000), 'Doublon') $$,
  'owner cancels a payment');
select is(
  (select balance from public.get_supplier_balances('00000000-0000-0000-0000-0000000000f1')
   where supplier_id = '00000000-0000-0000-0000-0000000005a1'),
  5000::bigint, 'a cancelled payment no longer counts');
select throws_ok(
  $$ select public.cancel_supplier_payment(
       (select id from public.supplier_payments where amount = 8000), 'Encore') $$,
  'P0001', 'ALREADY_CANCELLED', 'a payment is cancelled once');
select throws_ok(
  $$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 0, 'cash', null, null) $$,
  'P0001', 'INVALID_AMOUNT', 'a zero payment is refused');

-- get_supplier_lots ------------------------------------------------------------------------------
select results_eq(
  $$ select qty_available, unit_cost from public.get_supplier_lots(
       '00000000-0000-0000-0000-0000000005a1') $$,
  $$ values (2, 5200::bigint), (0, 5000::bigint) $$, 'lots of a supplier, newest first, with cost');

-- Expenses ---------------------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.expenses (shop_id, category, amount, note)
     values ('00000000-0000-0000-0000-0000000000f1', 'advertising', 5000, 'Sponsoring Instagram') $$,
  'owner records an advertising expense');
select lives_ok(
  $$ select public.cancel_expense((select id from public.expenses where category = 'advertising'),
       'Remboursé') $$,
  'owner cancels an expense');
select throws_ok(
  $$ select public.cancel_expense((select id from public.expenses where return_id is not null),
       'Erreur') $$,
  'P0001', 'LINKED_EXPENSE', 'a delivery expense is cancelled with its return, not alone');

-- Cancel the return: bags come back to A's lot -----------------------------------------------------
select lives_ok(
  $$ select public.cancel_return((select id from public.returns), 'Fournisseur absent') $$,
  'owner cancels the return');
select results_eq(
  $$ select qty_returned from public.lots order by received_at $$,
  $$ values (0), (0), (0) $$, 'cancelled return: quantities restored');
select is(
  (select status::text from public.expenses where return_id is not null),
  'cancelled', 'the delivery expense is cancelled with the return');

-- Manager --------------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select lives_ok(
  $$ select public.create_return('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a2', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 3}]', 0, null) $$,
  'a manager records a return');
select results_eq(
  $$ select supplier_id::text, qty_available from public.get_supplier_stock(
       '00000000-0000-0000-0000-0000000000f1') order by supplier_id $$,
  $$ values ('00000000-0000-0000-0000-0000000005a1', 5) $$,
  'get_supplier_stock: bags per supplier without cost (B is now empty)');
select throws_ok(
  $$ select * from public.get_supplier_balances('00000000-0000-0000-0000-0000000000f1') $$,
  '42501', 'FORBIDDEN', 'get_supplier_balances is refused to managers');
select throws_ok(
  $$ select * from public.get_supplier_lots('00000000-0000-0000-0000-0000000005a1') $$,
  '42501', 'FORBIDDEN', 'get_supplier_lots is refused to managers');
select is((select count(*)::int from public.supplier_payments), 0, 'a manager reads no supplier payment');
select throws_ok(
  $$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 1000, 'cash', null, null) $$,
  '42501', 'FORBIDDEN', 'a manager cannot pay a supplier');
select throws_ok(
  $$ select public.cancel_return((select id from public.returns where status = 'active'), 'Erreur') $$,
  '42501', 'FORBIDDEN', 'a manager cannot cancel a return');
select throws_ok(
  $$ select public.cancel_reception(
       (select id from public.receptions where received_at = '2026-09-05 10:00+00'), 'Erreur') $$,
  '42501', 'FORBIDDEN', 'a manager cannot cancel a reception');

select * from finish();
rollback;
