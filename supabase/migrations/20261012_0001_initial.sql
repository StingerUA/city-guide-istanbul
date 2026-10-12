-- City Guide / Supabase PostgreSQL baseline.
-- Apply ONLY in Supabase SQL Editor, never to the former D1 database.
-- The web application still uses D1 until the API migration is completed.
begin;

-- Privileged helpers live outside any Supabase exposed schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.cg_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null default 'tourist' check (role in ('tourist','partner')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cg_venues (
  id text primary key,
  owner_id text not null, -- 'demo' allowed; real owners are auth.users UUID strings
  status text not null check (status in ('draft','pending','published','archived')),
  city text not null,
  category text not null,
  is_demo boolean not null default false,
  version integer not null default 1 check (version > 0),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists cg_venues_owner_idx on public.cg_venues(owner_id);
create index if not exists cg_venues_status_city_idx on public.cg_venues(status,city);

create table if not exists public.cg_bookings (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id text not null references public.cg_venues(id),
  date date not null,
  end_date date not null,
  time time not null,
  guests integer not null check (guests > 0),
  status text not null check (status in ('pending','confirmed','cancelled','completed')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (end_date >= date)
);
create index if not exists cg_bookings_user_idx on public.cg_bookings(user_id);
create index if not exists cg_bookings_availability_idx on public.cg_bookings(venue_id,date,status);

create table if not exists public.cg_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id text not null references public.cg_venues(id) on delete cascade,
  primary key (user_id,venue_id)
);

create table if not exists public.cg_reviews (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id text not null references public.cg_venues(id),
  booking_id uuid not null unique references public.cg_bookings(id),
  payload jsonb not null,
  status text not null default 'published' check (status in ('published','hidden')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);
create index if not exists cg_reviews_venue_idx on public.cg_reviews(venue_id);

create table if not exists public.cg_feedback (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('app','help')),
  payload jsonb not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);
create index if not exists cg_feedback_user_idx on public.cg_feedback(user_id);

create table if not exists public.cg_uploads (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null unique,
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp')),
  created_at timestamptz not null default now()
);

create table if not exists public.cg_meta (
  key text primary key,
  value text not null
);

-- Administrative status is derived from a *confirmed* auth.users identity.
-- Neither user_metadata nor the editable cg_users.payload grants privileges.
create or replace function private.cg_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and lower(u.email) in ('nncdecdgc@gmail.com','sayitatas@hotmail.com')
  );
$$;

create or replace function private.cg_is_partner()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cg_users p
    where p.id = (select auth.uid()) and p.role = 'partner'
  );
$$;

create or replace function public.cg_init_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.cg_users(id,email,role,payload)
  values (
    new.id,
    coalesce(new.email,''),
    'tourist',
    jsonb_build_object('id',new.id,'email',coalesce(new.email,''),
      'role','tourist','name',coalesce(new.raw_user_meta_data->>'full_name','City Guide'),
      'phone','','language','ru','homeAddress','')
  )
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists cg_on_auth_user_created on auth.users;
create trigger cg_on_auth_user_created
after insert on auth.users
for each row execute function public.cg_init_user();

-- Backfill existing Supabase users, if any.
insert into public.cg_users(id,email,role,payload)
select id,coalesce(email,''),'tourist',
  jsonb_build_object('id',id,'email',coalesce(email,''),'role','tourist',
  'name',coalesce(raw_user_meta_data->>'full_name','City Guide'),
  'phone','','language','ru','homeAddress','')
from auth.users on conflict(id) do nothing;

alter table public.cg_users enable row level security;
alter table public.cg_venues enable row level security;
alter table public.cg_bookings enable row level security;
alter table public.cg_favorites enable row level security;
alter table public.cg_reviews enable row level security;
alter table public.cg_feedback enable row level security;
alter table public.cg_uploads enable row level security;
alter table public.cg_meta enable row level security;

-- Read-only RLS. Writes will be implemented as validated RPC functions in a
-- subsequent migration. No client gets general INSERT/UPDATE/DELETE rights.
create policy "profiles_self_or_admin" on public.cg_users
for select to authenticated using (id = (select auth.uid()) or (select private.cg_is_admin()));

create policy "venues_visible_or_owned" on public.cg_venues
for select to authenticated using (
  status = 'published' or owner_id = (select auth.uid())::text
  or (select private.cg_is_admin())
);

create policy "bookings_owner_partner_admin" on public.cg_bookings
for select to authenticated using (
  user_id = (select auth.uid()) or (select private.cg_is_admin())
  or exists (
    select 1 from public.cg_venues v
    where v.id = venue_id and v.owner_id = (select auth.uid())::text
      and (select private.cg_is_partner())
  )
);

create policy "favorites_self" on public.cg_favorites
for select to authenticated using (user_id = (select auth.uid()));

-- Review payload contains private booking IDs. Do NOT allow general public
-- SELECT on this table. A sanitized projection remains INTERNAL until safe API wiring.
create policy "reviews_private_owners" on public.cg_reviews
for select to authenticated using (
  user_id = (select auth.uid()) or (select private.cg_is_admin())
  or exists (
    select 1 from public.cg_venues v where v.id = venue_id
      and v.owner_id = (select auth.uid())::text and (select private.cg_is_partner())
  )
);

create or replace function private.cg_public_reviews()
returns table (review jsonb)
language sql stable security definer set search_path = ''
as $$
  select (r.payload - 'userId' - 'bookingId')
    || jsonb_build_object('status',r.status,'version',r.version)
  from public.cg_reviews r
  join public.cg_venues v on v.id = r.venue_id
  where r.status = 'published' and v.status = 'published'
  order by r.created_at desc limit 1000;
$$;

create policy "feedback_self_or_admin" on public.cg_feedback
for select to authenticated using (user_id = (select auth.uid()) or (select private.cg_is_admin()));

create policy "uploads_self_or_admin" on public.cg_uploads
for select to authenticated using (user_id = (select auth.uid()) or (select private.cg_is_admin()));

-- REVOKE explicit grants so default schema permissions cannot accidentally
-- allow unauthenticated or direct client writes.
revoke all on public.cg_users, public.cg_venues, public.cg_bookings,
  public.cg_favorites, public.cg_reviews, public.cg_feedback,
  public.cg_uploads, public.cg_meta from anon, authenticated;
grant select on public.cg_users, public.cg_venues, public.cg_bookings,
  public.cg_favorites, public.cg_reviews, public.cg_feedback,
  public.cg_uploads to authenticated;

revoke all on function private.cg_is_admin() from public, anon;
revoke all on function private.cg_is_partner() from public, anon;
revoke all on function private.cg_public_reviews() from public, anon;
grant execute on function private.cg_is_admin() to authenticated;
grant execute on function private.cg_is_partner() to authenticated;
-- Keep this sanitizer unavailable to browser roles until a reviewed API exposes it.

-- Private media bucket; actual read/write paths are implemented later.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('city-guide-photos','city-guide-photos',false,4194304,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

commit;
