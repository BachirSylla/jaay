-- create_shop: creates a shop with a unique slug and makes the caller its owner.

create extension if not exists unaccent with schema extensions;

-- Slugs that would be confusing or collide with app routes.
create function public.reserved_shop_slugs()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'admin', 'api', 'app', 'b', 'bienvenue', 'connexion', 'demo', 'inscription', 'jaay', 's', 'www'
  ];
$$;

-- "Chez Awa — Sacs & Co" → "chez-awa-sacs-co". At most 40 characters, never empty.
-- unaccent is called with its dictionary qualified: with search_path = '' the one-argument
-- form cannot find the "unaccent" dictionary.
create function public.slugify(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(
      trim(both '-' from left(
        regexp_replace(
          lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_value, ''))),
          '[^a-z0-9]+', '-', 'g'
        ),
        40
      )),
      ''
    ),
    'boutique'
  );
$$;

revoke execute on function public.reserved_shop_slugs() from public, anon, authenticated;
revoke execute on function public.slugify(text) from public, anon, authenticated;

create function public.create_shop(
  p_name text,
  p_whatsapp_phone text default null,
  p_slug text default null
)
returns public.shops
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := trim(p_name);
  v_phone text := nullif(trim(p_whatsapp_phone), '');
  v_base text;
  v_slug text;
  v_suffix integer := 1;
  v_shop public.shops;
begin
  -- No shop exists yet, so there is no role to check: the caller must be signed in.
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_name is null or char_length(v_name) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'INVALID_PHONE';
  end if;

  if p_slug is not null then
    -- Explicit slug: validated as is, never altered.
    if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) > 40 then
      raise exception 'INVALID_SLUG';
    end if;
    if p_slug = any (public.reserved_shop_slugs()) then
      raise exception 'SLUG_RESERVED';
    end if;

    begin
      insert into public.shops (name, slug, whatsapp_phone, created_by)
      values (v_name, p_slug, v_phone, v_user_id)
      returning * into v_shop;
    exception when unique_violation then
      raise exception 'SLUG_TAKEN';
    end;
  else
    -- Generated slug: base, then base-2, base-3… The unique constraint arbitrates
    -- concurrent creations, so two shops can never get the same slug.
    v_base := public.slugify(v_name);
    v_slug := v_base;
    loop
      if not (v_slug = any (public.reserved_shop_slugs())) then
        begin
          insert into public.shops (name, slug, whatsapp_phone, created_by)
          values (v_name, v_slug, v_phone, v_user_id)
          returning * into v_shop;
          exit;
        exception when unique_violation then
          null;
        end;
      end if;

      v_suffix := v_suffix + 1;
      if v_suffix > 1000 then
        raise exception 'SLUG_TAKEN';
      end if;
      v_slug := v_base || '-' || v_suffix;
    end loop;
  end if;

  insert into public.shop_members (shop_id, user_id, role)
  values (v_shop.id, v_user_id, 'owner');

  return v_shop;
end;
$$;

revoke execute on function public.create_shop(text, text, text) from public, anon;
grant execute on function public.create_shop(text, text, text) to authenticated;
