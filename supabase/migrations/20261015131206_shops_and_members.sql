-- Shops and their members, membership helpers, and row level security.

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 48),
  logo_path text,
  currency text not null default 'XOF',
  whatsapp_phone text check (whatsapp_phone ~ '^\+[1-9][0-9]{6,14}$'),   -- E.164
  show_public_prices boolean not null default true,
  catalog_enabled boolean not null default true,
  next_sale_number integer not null default 1,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.shop_role not null,
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create index shop_members_user_id_idx on public.shop_members (user_id);
-- Exactly one owner per shop.
create unique index shop_members_one_owner_idx on public.shop_members (shop_id) where role = 'owner';

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;

-- Membership helpers. security definer so they can read shop_members from inside
-- shop_members policies without recursion.
create function public.is_shop_member(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = p_shop_id and user_id = (select auth.uid())
  );
$$;

create function public.has_shop_role(p_shop_id uuid, p_roles public.shop_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = p_shop_id and user_id = (select auth.uid()) and role = any (p_roles)
  );
$$;

-- True when the current user and p_user_id belong to at least one common shop.
create function public.shares_shop_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shop_members me
    join public.shop_members other on other.shop_id = me.shop_id
    where me.user_id = (select auth.uid()) and other.user_id = p_user_id
  );
$$;

revoke execute on function public.is_shop_member(uuid) from public, anon;
revoke execute on function public.has_shop_role(uuid, public.shop_role[]) from public, anon;
revoke execute on function public.shares_shop_with(uuid) from public, anon;
grant execute on function public.is_shop_member(uuid) to authenticated;
grant execute on function public.has_shop_role(uuid, public.shop_role[]) to authenticated;
grant execute on function public.shares_shop_with(uuid) to authenticated;

-- profiles: also readable by members of a common shop.
create policy "profiles: read shop mates"
  on public.profiles for select to authenticated
  using (public.shares_shop_with(id));

-- shops: no direct insert (create_shop only), no delete. Only some columns are editable;
-- slug (shared links) and next_sale_number (sale numbering) are not.
revoke all on table public.shops from anon, authenticated;
grant select on table public.shops to authenticated;
grant update (name, whatsapp_phone, show_public_prices, catalog_enabled, logo_path)
  on table public.shops to authenticated;

create policy "shops: members read"
  on public.shops for select to authenticated
  using (public.is_shop_member(id));

create policy "shops: owner and admin update"
  on public.shops for update to authenticated
  using (public.has_shop_role(id, '{owner,admin}'))
  with check (public.has_shop_role(id, '{owner,admin}'));

-- shop_members: owner and admin manage members, but nobody can create, change or
-- remove the owner row from the client.
revoke all on table public.shop_members from anon, authenticated;
grant select, insert, delete on table public.shop_members to authenticated;
grant update (role) on table public.shop_members to authenticated;

create policy "shop_members: members read"
  on public.shop_members for select to authenticated
  using (public.is_shop_member(shop_id));

create policy "shop_members: owner and admin add non-owner members"
  on public.shop_members for insert to authenticated
  with check (public.has_shop_role(shop_id, '{owner,admin}') and role <> 'owner');

create policy "shop_members: owner and admin change non-owner roles"
  on public.shop_members for update to authenticated
  using (public.has_shop_role(shop_id, '{owner,admin}') and role <> 'owner')
  with check (public.has_shop_role(shop_id, '{owner,admin}') and role <> 'owner');

create policy "shop_members: owner and admin remove non-owner members"
  on public.shop_members for delete to authenticated
  using (public.has_shop_role(shop_id, '{owner,admin}') and role <> 'owner');
