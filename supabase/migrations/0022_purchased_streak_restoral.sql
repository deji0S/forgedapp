-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle,
-- AFTER migration 0007 (streak_recoveries, recover_streak, recompute_streak).
--
-- Adds a purchasable streak restoral (one-time £1 Stripe payment,
-- price_1UCSQ1QfDzhTmr7Bs2dtyblV), available to any user regardless of
-- Premium status. Reuses the streak_recoveries table so the existing
-- recompute_streak() union logic (migration 0007) needs no changes -- a
-- purchased bridge is just another row with source = 'purchased'.
--
-- The free path (recover_streak(), 30-day cadence, premium-only) is
-- unchanged. This migration only adds the paid path, applied exclusively by
-- the stripe-webhook edge function via the service role -- there is no grant
-- to `authenticated` on apply_purchased_streak_restoral, so a client can
-- never call it directly; it only runs after Stripe confirms payment.

alter table public.streak_recoveries
  add column if not exists source text not null default 'premium_free',
  add column if not exists stripe_checkout_session_id text unique;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'streak_recoveries_source_check'
  ) then
    alter table public.streak_recoveries
      add constraint streak_recoveries_source_check check (source in ('premium_free', 'purchased'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- apply_purchased_streak_restoral(): called only by the stripe-webhook edge
-- function (service role) after a checkout.session.completed event for the
-- streak-restoral price. Idempotent on stripe_checkout_session_id so Stripe's
-- webhook retries can never double-bridge. Skips the premium check and the
-- 30-day rate limit that recover_streak() enforces -- eligibility here is
-- "you paid for this restoral", not "you're premium and have one free".
--
-- If the user is no longer in a bridgeable state by the time this runs (e.g.
-- they logged a workout themselves in the meantime), this is a no-op that
-- returns the current streak unchanged rather than inserting a bad bridge --
-- see the client-side 24-hour offer window in src/lib/streak.ts, which keeps
-- this practically unreachable.
-- ---------------------------------------------------------------------------
create or replace function public.apply_purchased_streak_restoral(
  p_user_id uuid,
  p_stripe_session_id text
)
returns public.streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last date;
  v_bridge_end date := current_date - 1;
  v_result public.streaks;
begin
  -- Idempotent: a retried webhook for the same session is a no-op.
  if exists (
    select 1 from public.streak_recoveries where stripe_checkout_session_id = p_stripe_session_id
  ) then
    select * into v_result from public.streaks where user_id = p_user_id;
    return v_result;
  end if;

  select last_activity_date into v_last
  from public.streaks
  where user_id = p_user_id;

  if v_last is not null and v_last < current_date - 1 and v_last >= current_date - 3 then
    insert into public.streak_recoveries (user_id, bridge_start, bridge_end, source, stripe_checkout_session_id)
    values (p_user_id, v_last + 1, v_bridge_end, 'purchased', p_stripe_session_id);

    perform public.recompute_streak(p_user_id);
  end if;

  select * into v_result from public.streaks where user_id = p_user_id;
  return v_result;
end;
$$;

-- Deliberately no grant to `authenticated` -- only the service role (used by
-- stripe-webhook) may call this.
