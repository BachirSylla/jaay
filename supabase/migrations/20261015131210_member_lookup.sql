-- Finds an existing account by e-mail, to attach it to a shop instead of creating a new one.
-- Reserved to service_role (Server Action with the secret key): it must never let a client
-- probe which e-mails have an account.

create function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke execute on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
