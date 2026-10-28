-- Session revocation and MFA must apply to both the Worker and direct Data API reads.
-- No application rows are modified. All helpers have fixed search_path and explicit grants.
create or replace function private.cg_session_context()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  u auth.users%rowtype;
  s auth.sessions%rowtype;
  claims jsonb := auth.jwt();
  sid uuid;
  has_factor boolean;
  staff boolean;
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
  staff := lower(u.email) in ('nncdecdgc@gmail.com','sayitatas@hotmail.com')
    or exists(select 1 from public.cg_users where id=u.id and role='partner');
  return jsonb_build_object('active',true,'requires_mfa',staff or has_factor,
    'aal',case when has_factor and claims->>'aal'='aal2' and s.aal::text='aal2' then 'aal2' else 'aal1' end);
end;
$$;
revoke all on function private.cg_session_context() from public,anon;
grant execute on function private.cg_session_context() to authenticated;

create or replace function public.cg_session_context()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.cg_session_context();
$$;
revoke all on function public.cg_session_context() from public,anon;
grant execute on function public.cg_session_context() to authenticated;

create or replace function private.cg_session_authorized()
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce((c->>'active')::boolean,false)
    and (not coalesce((c->>'requires_mfa')::boolean,true) or c->>'aal'='aal2')
  from (select private.cg_session_context() as c) context;
$$;
revoke all on function private.cg_session_authorized() from public,anon;
grant execute on function private.cg_session_authorized() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['cg_users','cg_venues','cg_bookings','cg_favorites','cg_reviews','cg_feedback','cg_uploads'] loop
    execute format('create policy active_session_and_mfa on public.%I as restrictive for all to authenticated using ((select private.cg_session_authorized())) with check ((select private.cg_session_authorized()))',t);
  end loop;
end;
$$;

create index if not exists cg_favorites_venue_idx on public.cg_favorites(venue_id);
create index if not exists cg_reviews_user_idx on public.cg_reviews(user_id);
create index if not exists cg_uploads_user_idx on public.cg_uploads(user_id);
comment on function private.cg_session_context() is 'Checks only the authenticated caller: live session, verified account, ban/deletion, staff and enrolled MFA. Never trusts user_metadata.';
