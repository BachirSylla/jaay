-- Public catalog (no sign-in) and shop logos.

-- get_public_catalog -----------------------------------------------------------------------
-- The shop (name, logo, WhatsApp) and its public products in stock, with photos. Never a
-- cost or a quantity; the price only when the shop chose to show it. null when the slug is
-- unknown or the catalog is disabled.

create function public.get_public_catalog(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop public.shops;
begin
  select * into v_shop from public.shops where slug = p_slug and catalog_enabled;
  if v_shop.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'shop', jsonb_build_object(
      'name', v_shop.name,
      'slug', v_shop.slug,
      'logo_path', v_shop.logo_path,
      'whatsapp_phone', v_shop.whatsapp_phone,
      'show_prices', v_shop.show_public_prices
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'name', p.name,
               'color', p.color,
               'description', p.description,
               'category', c.name,
               'price', case when v_shop.show_public_prices then p.suggested_price end,
               'photos', coalesce((
                 select jsonb_agg(ph.storage_path order by ph.position, ph.id)
                 from public.product_photos ph where ph.product_id = p.id
               ), '[]'::jsonb)
             )
             order by c.position nulls last, p.name)
      from public.products p
      left join public.categories c on c.id = p.category_id
      where p.shop_id = v_shop.id
        and p.is_public
        and p.archived_at is null
        and exists (
          select 1
          from public.lots l
          join public.receptions r on r.id = l.reception_id
          where l.product_id = p.id and r.status = 'active'
            and l.qty_received - l.qty_sold - l.qty_returned > 0
        )
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_public_catalog(text) from public;
grant execute on function public.get_public_catalog(text) to anon, authenticated;

-- Shop logos ---------------------------------------------------------------------------------
-- Public read; owner/admin write under '<shop_id>/'.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-logos', 'shop-logos', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "shop-logos: members read"
  on storage.objects for select to authenticated
  using (bucket_id = 'shop-logos' and public.is_shop_member(public.storage_shop_id(name)));

create policy "shop-logos: owner and admin upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shop-logos'
    and public.has_shop_role(public.storage_shop_id(name), '{owner,admin}')
  );

create policy "shop-logos: owner and admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'shop-logos' and public.has_shop_role(public.storage_shop_id(name), '{owner,admin}'))
  with check (bucket_id = 'shop-logos' and public.has_shop_role(public.storage_shop_id(name), '{owner,admin}'));

create policy "shop-logos: owner and admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'shop-logos' and public.has_shop_role(public.storage_shop_id(name), '{owner,admin}'));

-- A logo must live in the folder of its shop.
alter table public.shops
  add constraint shops_logo_path_in_shop_folder
  check (logo_path is null or logo_path like id::text || '/%');
