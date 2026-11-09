-- Address of the shop, free text, shown on sale receipts.
alter table public.shops add column address text check (char_length(address) <= 200);

grant update (address) on table public.shops to authenticated;
