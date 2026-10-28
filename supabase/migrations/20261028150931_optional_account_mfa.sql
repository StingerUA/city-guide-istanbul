-- MFA is opt-in for every role, including administrators and partners.
-- Only a verified enrolled factor enables it. Existing factors are preserved.
create or replace function private.cg_session_context()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  u auth.users%rowtype;
  s auth.sessions%rowtype;
  claims jsonb := auth.jwt();
  sid uuid;
  has_factor boolean;
begin
  if auth.uid() is null or coalesce(claims->>'session_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('active',false);
  end if;
  sid := (claims->>'session_id')::uuid;
  select * into u from auth.users where id=auth.uid();
  if not found or u.deleted_at is not null or u.email_confirmed_at is null
     or (u.banned_until is not null and u.banned_until>now()) then
    return jsonb_build_object('active',false);
  end if;
  select * into s from auth.sessions where id=sid and user_id=u.id;
  if not found or (s.not_after is not null and s.not_after<=now()) then
    return jsonb_build_object('active',false);
  end if;
  select exists(select 1 from auth.mfa_factors where user_id=u.id and status='verified') into has_factor;
  return jsonb_build_object('active',true,'requires_mfa',has_factor,
    'aal',case when has_factor and claims->>'aal'='aal2' and s.aal::text='aal2' then 'aal2' else 'aal1' end);
end;
$$;
revoke all on function private.cg_session_context() from public,anon;
grant execute on function private.cg_session_context() to authenticated;

comment on function private.cg_session_context() is 'Checks the live authenticated session and account status. MFA is required only after voluntary verified-factor enrollment, regardless of role.';
