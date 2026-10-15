-- Reference data: default categories, isolation, cross-shop references, role rules, storage.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'x.owner@test.jaay', '{"full_name": "X Owner"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'x.manager@test.jaay', '{"full_name": "X Manager"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'y.owner@test.jaay', '{"full_name": "Y Owner"}');

-- create_shop adds the default categories ------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
select lives_ok($$ select public.create_shop('Zz Categories Test') $$, 'create_shop succeeds');
select is(
  (select count(*)::int from public.categories c join public.shops s on s.id = c.shop_id
   where s.slug = 'zz-categories-test'),
  4, 'create_shop creates the 4 default categories');
reset role;
select results_eq(
  $$ select c.name from public.categories c join public.shops s on s.id = c.shop_id
     where s.slug = 'zz-categories-test' order by c.position $$,
  $$ values ('Sacs à dos'), ('Sacs à main'), ('Sacs de voyage'), ('Autres') $$,
  'default categories are named and ordered');

-- Fixtures: shops X and Y with one row of each kind ---------------------------------------
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-ref-shop-x'),
  ('00000000-0000-0000-0000-0000000000f2', 'Shop Y', 'zz-ref-shop-y');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d2', 'manager'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d3', 'owner');
select public.create_default_categories('00000000-0000-0000-0000-0000000000f1');
select public.create_default_categories('00000000-0000-0000-0000-0000000000f2');
insert into public.categories (id, shop_id, name) values
  ('00000000-0000-0000-0000-000000000cb2', '00000000-0000-0000-0000-0000000000f2', 'Category Y');

insert into public.suppliers (id, shop_id, name) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000f1', 'Supplier X'),
  ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000000f2', 'Supplier Y');
insert into public.products (id, shop_id, category_id, name) values
  ('00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000000f1',
   (select id from public.categories where shop_id = '00000000-0000-0000-0000-0000000000f1' and name = 'Sacs à main'),
   'Product X'),
  ('00000000-0000-0000-0000-0000000009a2', '00000000-0000-0000-0000-0000000000f2', null, 'Product Y');
insert into public.product_photos (shop_id, product_id, storage_path) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009a1',
   '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000009a1/a.webp');
insert into public.customers (id, shop_id, name) values
  ('00000000-0000-0000-0000-000000000ca1', '00000000-0000-0000-0000-0000000000f1', 'Customer X'),
  ('00000000-0000-0000-0000-000000000ca2', '00000000-0000-0000-0000-0000000000f2', 'Customer Y');

-- X owner ------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';

select results_eq(
  $$ select name from public.suppliers where shop_id in
       ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2') $$,
  $$ values ('Supplier X') $$, 'X owner reads suppliers of X only');
select results_eq(
  $$ select name from public.products where shop_id in
       ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2') $$,
  $$ values ('Product X') $$, 'X owner reads products of X only');
select results_eq(
  $$ select name from public.customers where shop_id in
       ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2') $$,
  $$ values ('Customer X') $$, 'X owner reads customers of X only');
select results_eq(
  $$ select count(*)::int from public.categories where shop_id in
       ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2') $$,
  $$ values (4) $$, 'X owner reads categories of X only');
select results_eq(
  $$ select count(*)::int from public.product_photos $$, $$ values (1) $$,
  'X owner reads photos of X only');

select lives_ok(
  $$ insert into public.suppliers (shop_id, name, phone)
     values ('00000000-0000-0000-0000-0000000000f1', 'Nouveau', '+221771234567') $$,
  'X owner adds a supplier to X');
select throws_ok(
  $$ insert into public.suppliers (shop_id, name)
     values ('00000000-0000-0000-0000-0000000000f2', 'Intrus') $$,
  '42501', null, 'X owner cannot add a supplier to Y');
select throws_ok(
  $$ insert into public.products (shop_id, category_id, name)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000cb2', 'Cross') $$,
  '23503', null, 'a product cannot use a category of another shop');
select throws_ok(
  $$ update public.products set shop_id = '00000000-0000-0000-0000-0000000000f2'
     where id = '00000000-0000-0000-0000-0000000009a1' $$,
  '42501', null, 'shop_id of a product is not updatable');
select throws_ok(
  $$ delete from public.suppliers where id = '00000000-0000-0000-0000-0000000005a1' $$,
  '42501', null, 'suppliers are archived, never deleted');
select lives_ok(
  $$ update public.products set archived_at = now()
     where id = '00000000-0000-0000-0000-0000000009a1' $$,
  'X owner archives a product');
select results_eq(
  $$ with u as (update public.products set name = 'Pirate'
       where id = '00000000-0000-0000-0000-0000000009a2' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$, 'X owner cannot update a product of Y');
select throws_ok(
  $$ insert into public.product_photos (shop_id, product_id, storage_path)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000009a1',
             '00000000-0000-0000-0000-0000000000f2/x.webp') $$,
  '23514', null, 'a photo path must be inside its shop and product folder');

-- X manager ------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.products (shop_id, name)
     values ('00000000-0000-0000-0000-0000000000f1', 'Interdit') $$,
  '42501', null, 'a manager cannot create products');
select throws_ok(
  $$ insert into public.suppliers (shop_id, name)
     values ('00000000-0000-0000-0000-0000000000f1', 'Interdit') $$,
  '42501', null, 'a manager cannot create suppliers');
select lives_ok(
  $$ insert into public.customers (shop_id, name, type)
     values ('00000000-0000-0000-0000-0000000000f1', 'Client du gérant', 'reseller') $$,
  'a manager creates customers');
select lives_ok(
  $$ update public.customers set notes = 'Fidèle'
     where id = '00000000-0000-0000-0000-000000000ca1' $$,
  'a manager updates customers');
select results_eq(
  $$ with d as (delete from public.product_photos returning 1) select count(*)::int from d $$,
  $$ values (0) $$, 'a manager cannot delete photos');
select results_eq(
  $$ select count(*)::int from public.products $$, $$ values (1) $$,
  'a manager reads the products of the shop');

-- Y owner ------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d3", "role": "authenticated"}';
select results_eq(
  $$ select name from public.customers $$, $$ values ('Customer Y') $$,
  'Y owner reads no customer of X');

-- Storage policies -------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('product-photos',
             '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000009a1/t.webp') $$,
  'X owner uploads into the folder of X');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('product-photos',
             '00000000-0000-0000-0000-0000000000f2/00000000-0000-0000-0000-0000000009a2/t.webp') $$,
  '42501', null, 'X owner cannot upload into the folder of Y');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('product-photos',
             '00000000-0000-0000-0000-0000000000f1/00000000-0000-0000-0000-0000000009a1/m.webp') $$,
  '42501', null, 'a manager cannot upload product photos');

-- anon ---------------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select * from public.products $$, '42501', null, 'anon cannot read products');

select * from finish();
rollback;
