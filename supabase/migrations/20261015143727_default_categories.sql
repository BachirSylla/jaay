-- Default categories: created with every new shop, and added to the shops created before.

create function public.create_default_categories(p_shop_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (shop_id, name, position)
  values
    (p_shop_id, 'Sacs à dos', 1),
    (p_shop_id, 'Sacs à main', 2),
    (p_shop_id, 'Sacs de voyage', 3),
    (p_shop_id, 'Autres', 4)
  on conflict (shop_id, name) do nothing;
$$;

-- Internal helper: only create_shop (and this migration) call it.
revoke execute on function public.create_default_categories(uuid) from public, anon, authenticated;

select public.create_default_categories(id) from public.shops;

-- create_shop, same as before plus the default categories.
create or replace function public.create_shop(
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

  perform public.create_default_categories(v_shop.id);

  return v_shop;
end;
$$;
