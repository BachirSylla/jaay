-- Follow-up of advisor_fixes: the replaced (shop_id, …) indexes also covered the shop_id
-- foreign keys of sale_items and sale_item_allocations.
-- (20261016083013_advisor_fixes_shop_id was applied empty by mistake: it has no effect.)
create index sale_items_shop_id_idx on public.sale_items (shop_id);
create index sale_item_allocations_shop_id_idx on public.sale_item_allocations (shop_id);
