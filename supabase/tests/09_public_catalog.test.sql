-- get_public_catalog: anonymous access, what is exposed and what is not.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'x.owner@test.jaay', '{"full_name": "X Owner"}');
insert into public.shops (id, name, slug, whatsapp_phone) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-catalog-shop-x', '+221771234567');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'owner');
insert into public.suppliers (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000f1', 'Supplier');
-- A: public, in stock. B: public, sold out. C: hidden. D: archived. E: never received.
insert into public.products (id, shop_id, name, suggested_price, is_public, archived_at) values
  ('00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000000f1', 'A', 8000, true, null),
  ('00000000-0000-0000-0000-0000000009a2', '00000000-0000-0000-0000-0000000000f1', 'B', 9000, true, null),
  ('00000000-0000-0000-0000-0000000009a3', '00000000-0000-0000-0000-0000000000f1', 'C', 9000, false, null),
  ('00000000-0000-0000-0000-0000000009a4', '00000000-0000-0000-0000-0000000000f1', 'D', 9000, true, now()),
  ('00000000-0000-0000-0000-0000000009a5', '00000000-0000-0000-0000-0000000000f1', 'E', 9000, true, null);
insert into public.product_photos (shop_id, product_id, storage_path) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009a1',
   '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000009a1/p.webp');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';
select public.create_reception('00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000005a1', now() - interval '1 day',
  '[{"product_id": "00000000-0000-0000-0000-0000000009a1", "quantity": 3, "unit_cost": 5000},
    {"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_cost": 5000},
    {"product_id": "00000000-0000-0000-0000-0000000009a3", "quantity": 1, "unit_cost": 5000}]', 0, null);
select public.create_sale('00000000-0000-0000-0000-0000000000f1', null, 'individual', 'in_person',
  now(), '[{"product_id": "00000000-0000-0000-0000-0000000009a2", "quantity": 1, "unit_price": 9000}]',
  '[{"method": "cash", "amount": 9000}]', null);

reset role;
set local role anon;

select is(
  (public.get_public_catalog('zz-catalog-shop-x') -> 'shop' ->> 'name'), 'Shop X',
  'anon reads the public catalog');
select is(
  (public.get_public_catalog('zz-catalog-shop-x') -> 'shop' ->> 'whatsapp_phone'), '+221771234567',
  'the WhatsApp number is public');
select is(
  (select jsonb_agg(p ->> 'name') from jsonb_array_elements(
     public.get_public_catalog('zz-catalog-shop-x') -> 'products') p),
  '["A"]'::jsonb,
  'only public, non-archived products in stock are listed');
select is(
  (public.get_public_catalog('zz-catalog-shop-x') -> 'products' -> 0 ->> 'price')::bigint,
  8000::bigint, 'the suggested price is shown when the shop allows it');
select is(
  (public.get_public_catalog('zz-catalog-shop-x') -> 'products' -> 0 -> 'photos'),
  '["00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000009a1/p.webp"]'::jsonb,
  'photos are listed');
select is(
  (select count(*)::int from jsonb_object_keys(
     public.get_public_catalog('zz-catalog-shop-x') -> 'products' -> 0) k
   where k in ('unit_cost', 'cost', 'qty_available', 'reseller_price', 'quantity')),
  0, 'no cost, quantity or reseller price is exposed');
select is(public.get_public_catalog('zz-unknown-shop'), null, 'an unknown slug returns null');
select throws_ok($$ select * from public.products $$, '42501', null, 'anon cannot read products');
select throws_ok($$ select * from public.lots $$, '42501', null, 'anon cannot read lots');

reset role;
update public.shops set show_public_prices = false where id = '00000000-0000-0000-0000-0000000000f1';
set local role anon;
select is(
  (public.get_public_catalog('zz-catalog-shop-x') -> 'products' -> 0 -> 'price'), 'null'::jsonb,
  'no price when the shop shows "price on request"');

reset role;
update public.shops set catalog_enabled = false where id = '00000000-0000-0000-0000-0000000000f1';
set local role anon;
select is(public.get_public_catalog('zz-catalog-shop-x'), null, 'a disabled catalog returns null');

reset role;
select throws_ok(
  $$ update public.shops set logo_path = '00000000-0000-0000-0000-000000000099/logo.webp'
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  '23514', null, 'a logo must live in the folder of its shop');

select * from finish();
rollback;
