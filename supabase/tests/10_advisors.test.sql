-- Regression checks for the Supabase advisors fixed on 2026-10-16.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- Every foreign key of the public schema has an index whose leading columns are the key's
-- columns, in order (Performance Advisor "unindexed_foreign_keys").
select is_empty(
  $$ select c.conrelid::regclass::text || ' ' || c.conname
     from pg_constraint c
     join pg_namespace n on n.oid = c.connamespace
     where c.contype = 'f' and n.nspname = 'public'
       and not exists (
         select 1 from pg_index i
         where i.indrelid = c.conrelid
           and (string_to_array(i.indkey::text, ' ')::smallint[])[1:cardinality(c.conkey)] = c.conkey
       ) $$,
  'every foreign key of public has a covering index');

-- One permissive SELECT policy per table and role (advisor "multiple_permissive_policies").
select is_empty(
  $$ select tablename || ' ' || cmd || ' ' || r
     from pg_policies, unnest(roles) r
     where schemaname = 'public' and permissive = 'PERMISSIVE'
     group by tablename, cmd, r
     having count(*) > 1 $$,
  'no table has two permissive policies for the same role and action');

-- Profiles are still readable by their owner and by shop mates only.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.jaay', '{"full_name": "A"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'b@test.jaay', '{"full_name": "B"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'c@test.jaay', '{"full_name": "C"}');
insert into public.shops (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'Shop', 'zz-advisors-shop');
insert into public.shop_members (shop_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'manager');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select results_eq(
  $$ select full_name from public.profiles order by full_name $$,
  $$ values ('A'), ('B') $$,
  'merged policy: own profile and shop mates, nobody else');

select * from finish();
rollback;
