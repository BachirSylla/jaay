-- Colors per model (product variants): rights, receptions by color, FIFO per color, returns,
-- spreading uncolored stock over colors, public catalog, material.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'x.owner@test.jaay', '{"full_name": "X Owner"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'x.manager@test.jaay', '{"full_name": "X Manager"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'y.owner@test.jaay', '{"full_name": "Y Owner"}');
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-variants-shop-x'),
  ('00000000-0000-0000-0000-0000000000f2', 'Shop Y', 'zz-variants-shop-y');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'manager'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a3', 'owner');
insert into public.suppliers (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000f1', 'Supplier X');
-- B: model with colors. U: model without colors. L: stock recorded before its colors.
-- M: same, one untouched lot. C: another model with a color.
insert into public.products (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000000f1', 'B'),
  ('00000000-0000-0000-0000-0000000009b2', '00000000-0000-0000-0000-0000000000f1', 'U'),
  ('00000000-0000-0000-0000-0000000009b3', '00000000-0000-0000-0000-0000000000f1', 'L'),
  ('00000000-0000-0000-0000-0000000009b4', '00000000-0000-0000-0000-0000000000f1', 'M'),
  ('00000000-0000-0000-0000-0000000009b5', '00000000-0000-0000-0000-0000000000f1', 'C');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

-- Stock of L and M recorded before they had colors.
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-08-01 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009b3", "quantity": 5, "unit_cost": 6000},
    {"product_id": "00000000-0000-0000-0000-0000000009b4", "quantity": 2, "unit_cost": 7000}]', 0, null);
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'in_person',
  '2026-08-02 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009b3", "quantity": 1, "unit_price": 9000}]',
  '[{"method": "cash", "amount": 9000}]', null);

-- Colors: owner only ---------------------------------------------------------------------
select lives_ok(
  $$ insert into public.product_variants (id, shop_id, product_id, color, position) values
       ('00000000-0000-0000-0000-00000000c0b1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009b1', 'Marron', 0),
       ('00000000-0000-0000-0000-00000000c0b2', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009b1', 'Noir', 1),
       ('00000000-0000-0000-0000-00000000c0b3', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009b3', 'Marron', 0),
       ('00000000-0000-0000-0000-00000000c0b4', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009b3', 'Noir', 1),
       ('00000000-0000-0000-0000-00000000c0b5', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009b4', 'Sable', 0),
       ('00000000-0000-0000-0000-00000000c0b6', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009b5', 'Bleu', 0) $$,
  'owner adds colors to models');
select throws_ok(
  $$ insert into public.product_variants (shop_id, product_id, color) values
       ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009b1', 'noir ') $$,
  '23505', null, 'the same color twice on a model is refused (case and spaces ignored)');
select lives_ok(
  $$ update public.products set material = 'faux_leather'
     where id = '00000000-0000-0000-0000-0000000009b1' $$,
  'owner sets the material of a model');
select is(
  (select material::text from public.products where id = '00000000-0000-0000-0000-0000000009b1'),
  'faux_leather', 'material saved');

-- Receptions color by color --------------------------------------------------------------
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009b1", "quantity": 1, "unit_cost": 5000}]', 0, null) $$,
  'P0001', 'VARIANT_REQUIRED', 'a model with colors cannot be received without a color');
select throws_ok(
  $$ select public.create_reception('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009b1", "variant_id": "00000000-0000-0000-0000-00000000c0b6", "quantity": 1, "unit_cost": 5000}]', 0, null) $$,
  'P0001', 'INVALID_VARIANT', 'the color of another model is refused');

select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-09-01 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009b1", "variant_id": "00000000-0000-0000-0000-00000000c0b1", "quantity": 2, "unit_cost": 5000},
    {"product_id": "00000000-0000-0000-0000-0000000009b1", "variant_id": "00000000-0000-0000-0000-00000000c0b2", "quantity": 3, "unit_cost": 5000},
    {"product_id": "00000000-0000-0000-0000-0000000009b2", "quantity": 4, "unit_cost": 4000}]', 0, null);
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', '2026-09-20 10:00+00',
  '[{"product_id": "00000000-0000-0000-0000-0000000009b1", "variant_id": "00000000-0000-0000-0000-00000000c0b1", "quantity": 2, "unit_cost": 5500}]', 0, null);

select results_eq(
  $$ select variant_id, qty_available from public.get_variant_stock('00000000-0000-0000-0000-0000000000f1')
     where product_id = '00000000-0000-0000-0000-0000000009b1' order by qty_available $$,
  $$ values ('00000000-0000-0000-0000-00000000c0b2'::uuid, 3), ('00000000-0000-0000-0000-00000000c0b1'::uuid, 4) $$,
  'stock per color: 4 brown, 3 black');
select results_eq(
  $$ select qty_available from public.get_stock('00000000-0000-0000-0000-0000000000f1')
     where product_id = '00000000-0000-0000-0000-0000000009b1' $$,
  $$ values (7) $$, 'stock of the model: all colors together');

-- FIFO per color ----------------------------------------------------------------------------
select is(
  (public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'in_person',
     '2026-10-01 10:00+00',
     '[{"product_id": "00000000-0000-0000-0000-0000000009b1", "variant_id": "00000000-0000-0000-0000-00000000c0b1", "quantity": 3, "unit_price": 8000}]',
     '[{"method": "wave", "amount": 24000}]', null)).total_amount,
  24000::bigint, 'sale of 3 brown bags');
select results_eq(
  $$ select a.quantity, a.unit_cost from public.sale_item_allocations a
     join public.sale_items i on i.id = a.sale_item_id
     where i.variant_id = '00000000-0000-0000-0000-00000000c0b1' order by a.unit_cost $$,
  $$ values (2, 5000::bigint), (1, 5500::bigint) $$,
  'FIFO within the color: 2 brown at 5 000, then 1 brown at 5 500');
select results_eq(
  $$ select variant_id, qty_available from public.get_variant_stock('00000000-0000-0000-0000-0000000000f1')
     where product_id = '00000000-0000-0000-0000-0000000009b1' order by qty_available $$,
  $$ values ('00000000-0000-0000-0000-00000000c0b1'::uuid, 1), ('00000000-0000-0000-0000-00000000c0b2'::uuid, 3) $$,
  'black bags untouched: 1 brown, 3 black left');
select throws_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009b1", "variant_id": "00000000-0000-0000-0000-00000000c0b2", "quantity": 4, "unit_price": 8000}]',
       '[{"method": "cash", "amount": 32000}]', null) $$,
  'P0001', 'INSUFFICIENT_STOCK', 'more black bags than in stock is refused');
select throws_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009b1", "quantity": 1, "unit_price": 8000}]',
       '[{"method": "cash", "amount": 8000}]', null) $$,
  'P0001', 'INSUFFICIENT_STOCK', 'no color = only the uncolored stock, and B has none');
select lives_ok(
  $$ select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual',
       'in_person', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009b2", "quantity": 1, "unit_price": 6000}]',
       '[{"method": "cash", "amount": 6000}]', null) $$,
  'a model without colors sells as before');

-- Returns per color ------------------------------------------------------------------------
select lives_ok(
  $$ select public.create_return('00000000-0000-0000-0000-0000000000f1',
       '00000000-0000-0000-0000-0000000005a1', now(),
       '[{"product_id": "00000000-0000-0000-0000-0000000009b1", "variant_id": "00000000-0000-0000-0000-00000000c0b2", "quantity": 2}]', 0, null) $$,
  'return of 2 black bags');
select results_eq(
  $$ select variant_id, sum(quantity)::int from public.return_items group by variant_id $$,
  $$ values ('00000000-0000-0000-0000-00000000c0b2'::uuid, 2) $$,
  'the return lines carry the color');
select results_eq(
  $$ select qty_available from public.get_variant_stock('00000000-0000-0000-0000-0000000000f1')
     where variant_id = '00000000-0000-0000-0000-00000000c0b2' $$,
  $$ values (1) $$, '1 black bag left');

-- Spreading uncolored stock over colors -------------------------------------------------------
select lives_ok(
  $$ select public.assign_stock_colors('00000000-0000-0000-0000-0000000009b3',
       '[{"variant_id": "00000000-0000-0000-0000-00000000c0b3", "quantity": 3},
         {"variant_id": "00000000-0000-0000-0000-00000000c0b4", "quantity": 1}]') $$,
  'owner spreads the 4 uncolored bags of L: 3 brown, 1 black');
select results_eq(
  $$ select variant_id, qty_available from public.get_variant_stock('00000000-0000-0000-0000-0000000000f1')
     where product_id = '00000000-0000-0000-0000-0000000009b3' order by qty_available $$,
  $$ values (null::uuid, 0), ('00000000-0000-0000-0000-00000000c0b4'::uuid, 1), ('00000000-0000-0000-0000-00000000c0b3'::uuid, 3) $$,
  'L: 3 brown, 1 black, nothing left without color');
select results_eq(
  $$ select qty_received, qty_sold, unit_cost, received_at from public.lots
     where product_id = '00000000-0000-0000-0000-0000000009b3' order by qty_received desc, variant_id nulls first $$,
  $$ values (3, 0, 6000::bigint, '2026-08-01 10:00+00'::timestamptz),
            (1, 1, 6000::bigint, '2026-08-01 10:00+00'::timestamptz),
            (1, 0, 6000::bigint, '2026-08-01 10:00+00'::timestamptz) $$,
  'the lot is split: same date and cost, the sold bag stays on the uncolored lot');
select is(
  (select sum(a.quantity * a.unit_cost)::bigint from public.sale_item_allocations a
   join public.sale_items i on i.id = a.sale_item_id
   where i.product_id = '00000000-0000-0000-0000-0000000009b3'),
  6000::bigint, 'amount due for L unchanged');
select lives_ok(
  $$ select public.assign_stock_colors('00000000-0000-0000-0000-0000000009b4',
       '[{"variant_id": "00000000-0000-0000-0000-00000000c0b5", "quantity": 2}]') $$,
  'owner gives its color to the untouched lot of M');
select results_eq(
  $$ select variant_id, qty_received from public.lots
     where product_id = '00000000-0000-0000-0000-0000000009b4' $$,
  $$ values ('00000000-0000-0000-0000-00000000c0b5'::uuid, 2) $$,
  'an untouched lot of a single color is not split');
select throws_ok(
  $$ select public.assign_stock_colors('00000000-0000-0000-0000-0000000009b3',
       '[{"variant_id": "00000000-0000-0000-0000-00000000c0b3", "quantity": 1}]') $$,
  'P0001', 'INSUFFICIENT_STOCK', 'cannot color more bags than the uncolored stock');

-- Public catalog: colors still in stock ---------------------------------------------------------
select is(
  (select p -> 'colors' from jsonb_array_elements(
     public.get_public_catalog('zz-variants-shop-x') -> 'products') p
   where p ->> 'name' = 'B'),
  '["Marron", "Noir"]'::jsonb, 'catalog lists the colors in stock');

-- Manager: reads colors and stock, cannot change them ---------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}';
select is(
  (select count(*)::int from public.get_variant_stock('00000000-0000-0000-0000-0000000000f1')
   where product_id = '00000000-0000-0000-0000-0000000009b1'),
  2, 'manager reads the stock per color');
select throws_ok(
  $$ select public.assign_stock_colors('00000000-0000-0000-0000-0000000009b3',
       '[{"variant_id": "00000000-0000-0000-0000-00000000c0b3", "quantity": 1}]') $$,
  '42501', 'FORBIDDEN', 'manager cannot spread stock over colors');

-- Isolation ----------------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a3", "role": "authenticated"}';
select is((select count(*)::int from public.product_variants), 0, 'Y owner reads no color of X');

select * from finish();
rollback;
