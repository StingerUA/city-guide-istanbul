-- City Guide website administrators are identified by confirmed Supabase Auth emails.
-- This is NOT Supabase project/dashboard administration.
-- Never trust editable profile fields or user metadata for admin privileges.
begin;
create or replace function private.cg_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and lower(u.email) in (
        'nncdecdgc@gmail.com',
        'sayitatas@hotmail.com',
        'sayitatas@gmail.com'
      )
  );
$$;
commit;
