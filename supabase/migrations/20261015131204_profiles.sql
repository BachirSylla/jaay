-- Profiles: one row per auth user, created and kept in sync by triggers on auth.users.

create type public.shop_role as enum ('owner', 'admin', 'manager');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  email text,                                  -- copy of auth.users.email, synced by trigger
  phone text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Column privileges: RLS filters rows, not columns. Users may only edit their name and
-- phone; email and is_platform_admin are never writable from the client.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;

create policy "profiles: read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- On sign-up (and on auth.admin.createUser), create the profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Membre'
      ),
      100
    ),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when the e-mail changes in auth.users.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Trigger functions must not be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
