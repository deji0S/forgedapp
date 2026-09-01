-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Adds Stripe-backed premium subscriptions. One row per user; written ONLY by
-- the stripe-webhook edge function (service role), read by the client via RLS.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  -- Mirrors Stripe's subscription.status: active, trialing, past_due,
  -- canceled, incomplete, incomplete_expired, unpaid, paused.
  status text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users may read their own subscription. There are deliberately no
-- insert/update/delete policies: the stripe-webhook edge function uses the
-- service-role key (which bypasses RLS) and is the only writer.
drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create or replace trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

-- Single source of truth for "is this user premium right now", usable from
-- both the client (select public.is_premium(auth.uid())) and other
-- security-definer functions (e.g. public.recover_streak in migration 0007).
create or replace function public.is_premium(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = uid
      and status in ('active', 'trialing')
  );
$$;

grant execute on function public.is_premium(uuid) to authenticated;
