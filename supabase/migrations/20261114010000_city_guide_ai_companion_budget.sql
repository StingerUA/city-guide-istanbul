-- City Guide AI companion: isolated conversation history and atomic monthly budget guard.
create table if not exists public.cg_ai_budget (
  month_key text primary key,
  spent_usd numeric(12,6) not null default 0 check (spent_usd >= 0),
  reserved_usd numeric(12,6) not null default 0 check (reserved_usd >= 0),
  updated_at timestamptz not null default now()
);
alter table public.cg_ai_budget enable row level security;
revoke all on public.cg_ai_budget from anon, authenticated;
grant all on public.cg_ai_budget to service_role;

create table if not exists public.cg_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'City Guide AI',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cg_ai_conversations_user_updated_idx on public.cg_ai_conversations(user_id, updated_at desc);
alter table public.cg_ai_conversations enable row level security;
revoke all on public.cg_ai_conversations from anon, authenticated;
grant all on public.cg_ai_conversations to service_role;

create table if not exists public.cg_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.cg_ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12,8) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cg_ai_messages_conversation_created_idx on public.cg_ai_messages(conversation_id, created_at);
alter table public.cg_ai_messages enable row level security;
revoke all on public.cg_ai_messages from anon, authenticated;
grant all on public.cg_ai_messages to service_role;

create or replace function public.cg_ai_reserve(p_month text, p_amount numeric, p_limit numeric)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_row public.cg_ai_budget%rowtype;
begin
  if p_amount <= 0 or p_limit <= 0 or p_amount > p_limit then return false; end if;
  insert into public.cg_ai_budget(month_key) values (p_month) on conflict do nothing;
  select * into current_row from public.cg_ai_budget where month_key = p_month for update;
  if current_row.spent_usd + current_row.reserved_usd + p_amount > p_limit then return false; end if;
  update public.cg_ai_budget set reserved_usd = reserved_usd + p_amount, updated_at = now() where month_key = p_month;
  return true;
end; $$;
create or replace function public.cg_ai_settle(p_month text, p_reserved numeric, p_actual numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.cg_ai_budget(month_key) values (p_month) on conflict do nothing;
  update public.cg_ai_budget set reserved_usd = greatest(0, reserved_usd - greatest(0,p_reserved)),
    spent_usd = spent_usd + greatest(0,p_actual), updated_at = now() where month_key = p_month;
end; $$;
revoke all on function public.cg_ai_reserve(text,numeric,numeric) from public, anon, authenticated;
revoke all on function public.cg_ai_settle(text,numeric,numeric) from public, anon, authenticated;
grant execute on function public.cg_ai_reserve(text,numeric,numeric) to service_role;
grant execute on function public.cg_ai_settle(text,numeric,numeric) to service_role;
