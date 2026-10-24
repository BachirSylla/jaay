-- Supplier payments tied to the sold bags they pay for.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'x.owner@test.jaay', '{"full_name": "X Owner"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'x.manager@test.jaay', '{"full_name": "X Manager"}');
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-payitems-shop-x');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'manager');
insert into public.suppliers (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000f1', 'Supplier X'),
  ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000000f1', 'Supplier Z');
insert into public.products (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000000f1', 'Spacieux'),
  ('00000000-0000-0000-0000-0000000009c2', '00000000-0000-0000-0000-0000000000f1', 'Resistance'),
  ('00000000-0000-0000-0000-0000000009c3', '00000000-0000-0000-0000-0000000000f1', 'Other');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-09-27 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009c1", "quantity": 4, "unit_cost": 5500},
    {"product_id": "00000000-0000-0000-0000-0000000009c2", "quantity": 1, "unit_cost": 10000}]', 0, null);
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a2', '2026-09-27 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009c3", "quantity": 1, "unit_cost": 3000}]', 0, null);
-- Sale 1: 2 Spacieux; sale 2: the Resistance; sale 3: a bag of supplier Z.
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'in_person',
  '2026-10-01 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009c1", "quantity": 2, "unit_price": 10000}]',
  '[{"method": "cash", "amount": 20000}]', null);
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'in_person',
  '2026-10-19 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009c2", "quantity": 1, "unit_price": 15000}]',
  '[{"method": "wave", "amount": 15000}]', null);
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'in_person',
  '2026-10-19 11:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009c3", "quantity": 1, "unit_price": 5000}]',
  '[{"method": "cash", "amount": 5000}]', null);

create temp table alloc as
select a.id, i.product_id from public.sale_item_allocations a
join public.sale_items i on i.id = a.sale_item_id;
grant select on alloc to authenticated;

-- The owner pays exactly the Resistance (the oldest bags stay unpaid) -------------------------
select lives_ok(
  format($$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 10000, 'wave', '2026-10-19 14:00+00', null,
       '[{"allocation_id": "%s", "quantity": 1}]') $$,
    (select id from alloc where product_id = '00000000-0000-0000-0000-0000000009c2')),
  'payment of 10 000 F for the Resistance');
select results_eq(
  $$ select a.product_id, pi.quantity, pi.amount from public.supplier_payment_items pi
     join alloc a on a.id = pi.allocation_id $$,
  $$ values ('00000000-0000-0000-0000-0000000009c2'::uuid, 1, 10000::bigint) $$,
  'the payment line is the Resistance at its supplier price');
select results_eq(
  $$ select due, paid, balance from public.get_supplier_balances('00000000-0000-0000-0000-0000000000f1')
     where supplier_id = '00000000-0000-0000-0000-0000000005a1' $$,
  $$ values (21000::bigint, 10000::bigint, 11000::bigint) $$,
  'balance unchanged: 21 000 F sold, 10 000 F paid, 11 000 F due');

-- Refusals --------------------------------------------------------------------------------------
select throws_ok(
  format($$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 10000, 'wave', null, null,
       '[{"allocation_id": "%s", "quantity": 1}]') $$,
    (select id from alloc where product_id = '00000000-0000-0000-0000-0000000009c2')),
  'P0001', 'ALREADY_PAID', 'a bag cannot be paid twice');
select throws_ok(
  format($$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 3000, 'wave', null, null,
       '[{"allocation_id": "%s", "quantity": 1}]') $$,
    (select id from alloc where product_id = '00000000-0000-0000-0000-0000000009c3')),
  'P0001', 'INVALID_ITEM', 'a bag of another supplier is refused');
select throws_ok(
  format($$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 5000, 'wave', null, null,
       '[{"allocation_id": "%s", "quantity": 1}]') $$,
    (select id from alloc where product_id = '00000000-0000-0000-0000-0000000009c1')),
  'P0001', 'PAYMENT_MISMATCH', 'the bags chosen cannot cost more than the payment');
select throws_ok(
  format($$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 20000, 'wave', null, null,
       '[{"allocation_id": "%s", "quantity": 3}]') $$,
    (select id from alloc where product_id = '00000000-0000-0000-0000-0000000009c1')),
  'P0001', 'ALREADY_PAID', 'more bags than sold on the line is refused');
select is((select count(*)::int from public.supplier_payments), 1, 'refused payments wrote nothing');

-- One Spacieux plus an advance ------------------------------------------------------------------------
select lives_ok(
  format($$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 8000, 'cash', null, null,
       '[{"allocation_id": "%s", "quantity": 1}]') $$,
    (select id from alloc where product_id = '00000000-0000-0000-0000-0000000009c1')),
  '8 000 F: one Spacieux (5 500 F) and an advance of 2 500 F');
select is(
  (select sum(pi.quantity)::int from public.supplier_payment_items pi
   join alloc a on a.id = pi.allocation_id
   where a.product_id = '00000000-0000-0000-0000-0000000009c1'),
  1, 'one of the two Spacieux is paid');
select lives_ok(
  $$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 1000, 'cash', null, 'acompte', null) $$,
  'a payment without bags is an advance');

-- Manager: neither the payments nor their bags --------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}';
select is((select count(*)::int from public.supplier_payment_items), 0, 'manager reads no paid bag');
select throws_ok(
  $$ select public.create_supplier_payment('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', 1000, 'cash', null, null, null) $$,
  '42501', 'FORBIDDEN', 'manager cannot pay the supplier');

-- Direct writes are refused ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.supplier_payment_items (shop_id, payment_id, allocation_id, quantity, amount)
     select '00000000-0000-0000-0000-0000000000f1', p.id, a.id, 1, 0
     from public.supplier_payments p, alloc a limit 1 $$,
  '42501', null, 'owner cannot write paid bags directly');

select * from finish();
rollback;
