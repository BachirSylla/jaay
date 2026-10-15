-- Profiles: creation and e-mail sync by trigger, column privileges, visibility.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'awa@test.jaay', '{"full_name": "Awa Diop"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'moussa@test.jaay', '{}'),
  ('00000000-0000-0000-0000-0000000000a3', 'fatou@test.jaay', '{"full_name": "Fatou Sow"}');

select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Awa Diop', 'sign-up creates the profile with full_name from metadata');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'moussa', 'without full_name, the e-mail local part is used');
select is(
  (select email from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'awa@test.jaay', 'profile e-mail is copied from auth.users');

update auth.users set email = 'awa.diop@test.jaay' where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select email from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'awa.diop@test.jaay', 'profile e-mail follows an e-mail change in auth.users');

-- Awa and Fatou share a shop; Moussa is alone.
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-00000000005a', 'Boutique test', 'boutique-test-profiles');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000a3', 'manager');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

select results_eq(
  $$ select full_name from public.profiles order by full_name $$,
  $$ values ('Awa Diop'), ('Fatou Sow') $$,
  'a user reads their own profile and those of shop mates only');

select lives_ok(
  $$ update public.profiles set full_name = 'Awa D.', phone = '+221770000000'
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'a user can update their name and phone');
select throws_ok(
  $$ update public.profiles set is_platform_admin = true
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'a user cannot make themselves platform admin');
select throws_ok(
  $$ update public.profiles set email = 'other@test.jaay'
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'a user cannot change the profile e-mail');
select results_eq(
  $$ with u as (update public.profiles set full_name = 'Piraté'
       where id = '00000000-0000-0000-0000-0000000000a3' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$,
  'a user cannot update a shop mate profile');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}';
select results_eq(
  $$ select full_name from public.profiles $$,
  $$ values ('moussa') $$,
  'a user without shop reads only their own profile');

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null, 'anon cannot read profiles');

select * from finish();
rollback;
