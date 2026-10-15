-- Storage bucket for product photos. Public read (catalog, WhatsApp previews); writes by
-- owner/admin of the shop whose id is the first folder of the path:
-- '<shop_id>/<product_id>/<uuid>.webp' (JPEG when the browser cannot encode WebP).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- First folder of an object path as a shop id, or null when it is not a uuid.
create function public.storage_shop_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end;
$$;

-- Public URLs do not need this; the Storage API does (remove/upsert check SELECT too).
create policy "product-photos: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'product-photos'
    and public.is_shop_member(public.storage_shop_id(name))
  );

create policy "product-photos: owner and admin upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-photos'
    and public.has_shop_role(public.storage_shop_id(name), '{owner,admin}')
  );

create policy "product-photos: owner and admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-photos'
    and public.has_shop_role(public.storage_shop_id(name), '{owner,admin}')
  )
  with check (
    bucket_id = 'product-photos'
    and public.has_shop_role(public.storage_shop_id(name), '{owner,admin}')
  );

create policy "product-photos: owner and admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-photos'
    and public.has_shop_role(public.storage_shop_id(name), '{owner,admin}')
  );
