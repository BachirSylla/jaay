-- Isolation between two shops and role rules on shops / shop_members.
-- Extend this file with every new shop-scoped table.
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- Shop X: owner, admin, manager. Shop Y: owner. Newcomer: no shop.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'x.owner@test.jaay', '{"full_name": "X Owner"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'x.admin@test.jaay', '{"full_name": "X Admin"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'x.manager@test.jaay', '{"full_name": "X Manager"}'),
  ('00000000-0000-0000-0000-0000000000c4', 'y.owner@test.jaay', '{"full_name": "Y Owner"}'),
  ('00000000-0000-0000-0000-0000000000c5', 'newcomer@test.jaay', '{"full_name": "Newcomer"}');

insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop X', 'zz-test-shop-x'),
  ('00000000-0000-0000-0000-0000000000f2', 'Shop Y', 'zz-test-shop-y');

insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c2', 'admin'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c3', 'manager'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c4', 'owner');

-- X owner ------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}';

select results_eq($$ select name from public.shops $$, $$ values ('Shop X') $$,
  'X owner reads shop X only');
select results_eq(
  $$ select count(*)::int from public.shop_members
     where shop_id = '00000000-0000-0000-0000-0000000000f2' $$,
  $$ values (0) $$, 'X owner reads no member of shop Y');
select results_eq($$ select count(*)::int from public.shop_members $$, $$ values (3) $$,
  'X owner reads the 3 members of shop X');
select results_eq(
  $$ select full_name from public.profiles order by full_name $$,
  $$ values ('X Admin'), ('X Manager'), ('X Owner') $$,
  'X owner reads profiles of shop X members only');
select results_eq(
  $$ with u as (update public.shops set name = 'Pirate'
       where id = '00000000-0000-0000-0000-0000000000f2' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$, 'X owner cannot update shop Y');
select throws_ok(
  $$ insert into public.shop_members (shop_id, user_id, role)
     values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'admin') $$,
  '42501', null, 'X owner cannot add themselves to shop Y');
select throws_ok(
  $$ insert into public.shops (name, slug) values ('Direct', 'zz-direct') $$,
  '42501', null, 'direct insert into shops is refused');
select throws_ok(
  $$ update public.shops set next_sale_number = 99
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  '42501', null, 'next_sale_number is not writable from the client');
select throws_ok(
  $$ update public.shops set slug = 'zz-nouveau'
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  '42501', null, 'slug is frozen after creation');
select throws_ok(
  $$ delete from public.shops where id = '00000000-0000-0000-0000-0000000000f1' $$,
  '42501', null, 'shops cannot be deleted from the client');
select lives_ok(
  $$ update public.shops set name = 'Shop X bis', show_public_prices = false
     where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'X owner can update the settings of shop X');

-- X admin ------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.shop_members (shop_id, user_id, role)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c5', 'manager') $$,
  'X admin can add a manager');
select lives_ok(
  $$ update public.shop_members set role = 'admin'
     where shop_id = '00000000-0000-0000-0000-0000000000f1'
       and user_id = '00000000-0000-0000-0000-0000000000c5' $$,
  'X admin can change a member role');
select throws_ok(
  $$ update public.shop_members set role = 'owner'
     where shop_id = '00000000-0000-0000-0000-0000000000f1'
       and user_id = '00000000-0000-0000-0000-0000000000c5' $$,
  '42501', null, 'X admin cannot promote a member to owner');
select throws_ok(
  $$ insert into public.shop_members (shop_id, user_id, role)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c4', 'owner') $$,
  '42501', null, 'X admin cannot add an owner');
select throws_ok(
  $$ insert into public.shop_members (shop_id, user_id, role)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c3', 'admin') $$,
  '23505', null, 'an existing member cannot be added twice');
select results_eq(
  $$ with u as (update public.shop_members set role = 'manager'
       where user_id = '00000000-0000-0000-0000-0000000000c1' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$, 'X admin cannot demote the owner');
select results_eq(
  $$ with d as (delete from public.shop_members
       where user_id = '00000000-0000-0000-0000-0000000000c1' returning 1)
     select count(*)::int from d $$,
  $$ values (0) $$, 'X admin cannot remove the owner');
select throws_ok(
  $$ update public.shop_members set user_id = '00000000-0000-0000-0000-0000000000c4'
     where user_id = '00000000-0000-0000-0000-0000000000c5' $$,
  '42501', null, 'only the role of a membership is writable');
select lives_ok(
  $$ delete from public.shop_members
     where shop_id = '00000000-0000-0000-0000-0000000000f1'
       and user_id = '00000000-0000-0000-0000-0000000000c5' $$,
  'X admin can remove a non-owner member');

-- X manager ----------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';

select results_eq($$ select name from public.shops $$, $$ values ('Shop X bis') $$,
  'X manager reads shop X only');
select throws_ok(
  $$ insert into public.shop_members (shop_id, user_id, role)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c5', 'manager') $$,
  '42501', null, 'X manager cannot add members');
select results_eq(
  $$ with u as (update public.shops set name = 'Pirate'
       where id = '00000000-0000-0000-0000-0000000000f1' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$, 'X manager cannot update shop settings');
select results_eq(
  $$ with d as (delete from public.shop_members
       where user_id = '00000000-0000-0000-0000-0000000000c2' returning 1)
     select count(*)::int from d $$,
  $$ values (0) $$, 'X manager cannot remove members');

-- Y owner ------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c4", "role": "authenticated"}';

select results_eq($$ select name from public.shops $$, $$ values ('Shop Y') $$,
  'Y owner reads shop Y only');
select results_eq($$ select full_name from public.profiles $$, $$ values ('Y Owner') $$,
  'Y owner reads no profile of shop X');

-- anon ---------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select * from public.shops $$, '42501', null, 'anon cannot read shops');
select throws_ok($$ select * from public.shop_members $$, '42501', null,
  'anon cannot read shop_members');

-- member lookup --------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}';
select throws_ok($$ select public.find_user_id_by_email('y.owner@test.jaay') $$, '42501', null,
  'find_user_id_by_email is not callable by authenticated users');

select * from finish();
rollback;
