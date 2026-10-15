-- create_shop: owner membership, slug generation, uniqueness, validation, access.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'owner@test.jaay', '{"full_name": "Awa"}');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';

select is(
  (public.create_shop('Zz Test — Sacs & Co', '+221771234567')).slug,
  'zz-test-sacs-co', 'slug is generated from the name');
select results_eq(
  $$ select m.role::text, s.name, s.whatsapp_phone
     from public.shop_members m join public.shops s on s.id = m.shop_id
     where s.slug = 'zz-test-sacs-co' $$,
  $$ values ('owner', 'Zz Test — Sacs & Co', '+221771234567') $$,
  'the caller becomes owner of the new shop');
select is((public.create_shop('Zz Test Sacs Co')).slug, 'zz-test-sacs-co-2',
  'a taken slug gets suffix -2');
select is((public.create_shop('zz test sacs co!')).slug, 'zz-test-sacs-co-3',
  'then suffix -3');
select is((public.create_shop('Zz Élégance Dakar')).slug, 'zz-elegance-dakar',
  'accents are removed');
select is((public.create_shop('  Zz  --  Çà et là  ')).slug, 'zz-ca-et-la',
  'symbols and repeated separators collapse to one dash');
select is((public.create_shop('!!!')).slug ~ '^boutique(-[0-9]+)?$', true,
  'a name without letters or digits falls back to "boutique"');
select is((public.create_shop('Connexion')).slug, 'connexion-2',
  'a reserved generated slug gets a suffix');
select is(
  char_length((public.create_shop('Zz ' || repeat('abcdefghi ', 5))).slug) <= 40, true,
  'generated slugs are at most 40 characters');
select is((public.create_shop('Zz Ma Boutique', null, 'zz-mon-lien')).slug, 'zz-mon-lien',
  'an explicit free slug is used as is');

select throws_ok($$ select public.create_shop('Autre', null, 'zz-mon-lien') $$,
  'P0001', 'SLUG_TAKEN', 'an explicit taken slug is refused');
select throws_ok($$ select public.create_shop('Autre', null, 'bienvenue') $$,
  'P0001', 'SLUG_RESERVED', 'an explicit reserved slug is refused');
select throws_ok($$ select public.create_shop('Autre', null, 'Mon Lien') $$,
  'P0001', 'INVALID_SLUG', 'an explicit malformed slug is refused');
select throws_ok($$ select public.create_shop('   ') $$,
  'P0001', 'INVALID_NAME', 'an empty name is refused');
select throws_ok($$ select public.create_shop('Autre', '77 123 45 67') $$,
  'P0001', 'INVALID_PHONE', 'a non E.164 WhatsApp number is refused');

set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok($$ select public.create_shop('Sans compte') $$,
  '42501', 'FORBIDDEN', 'a request without user is refused');

reset role;
set local role anon;
select throws_ok($$ select public.create_shop('Anonyme') $$,
  '42501', null, 'anon cannot call create_shop');

select * from finish();
rollback;
