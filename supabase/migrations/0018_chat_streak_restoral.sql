-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle,
-- AFTER migrations 0006 (is_premium), 0007 (personal recovery pattern) and
-- 0017 (chat_streaks).
--
-- Joint streak restoral (premium feature): either participant in a chat, if
-- they're premium, can bridge a 1-2 day lapse in their JOINT streak once per
-- rolling 7 days (weekly) -- the personal recovery in migration 0007 stays on
-- its own 30-day cadence; this is a separate, faster cadence for the joint
-- feature only. The rate limit is shared per pair, not per person: whichever
-- of the two uses it first "spends" that pair's restoral for the week.
--
-- chat_opens is left untouched (same reasoning as workout_logs in 0007) --
-- the bridge lives only in chat_streak_recoveries and only affects streak
-- math, via a redefinition of recompute_chat_streak below.

create table if not exists public.chat_streak_recoveries (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  recovered_by uuid not null references auth.users (id) on delete cascade,
  bridge_start date not null,
  bridge_end date not null,
  created_at timestamptz not null default now(),
  constraint chat_streak_recoveries_ordered check (user_a_id < user_b_id)
);

create index if not exists chat_streak_recoveries_pair_idx
  on public.chat_streak_recoveries (user_a_id, user_b_id);

alter table public.chat_streak_recoveries enable row level security;

-- Read-only for either participant; the only writer is recover_chat_streak() below.
drop policy if exists "Participants can view chat streak recoveries" on public.chat_streak_recoveries;
create policy "Participants can view chat streak recoveries"
  on public.chat_streak_recoveries for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- ---------------------------------------------------------------------------
-- Redefinition of public.recompute_chat_streak (originally migration 0017)
-- that unions bridged recovery days directly into the joint (intersected)
-- date set -- a recovery excuses the PAIR's miss, not either person's
-- individual chat_opens history, so it belongs at the joint_dates level
-- rather than mixed into each side's own dates. Everything else unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_chat_streak(p_user_a uuid, p_user_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid := least(p_user_a, p_user_b);
  v_b uuid := greatest(p_user_a, p_user_b);
  v_current integer;
  v_longest integer;
  v_last_date date;
begin
  with a_dates as (
    select opened_date as d
    from public.chat_opens
    where user_id = v_a and other_user_id = v_b
  ),
  b_dates as (
    select opened_date as d
    from public.chat_opens
    where user_id = v_b and other_user_id = v_a
  ),
  joint_dates as (
    select d from a_dates
    intersect
    select d from b_dates
    union
    select gs::date
    from public.chat_streak_recoveries csr
    cross join lateral generate_series(csr.bridge_start, csr.bridge_end, interval '1 day') as gs
    where csr.user_a_id = v_a and csr.user_b_id = v_b
  ),
  islands as (
    select d, d - (row_number() over (order by d))::integer as grp
    from joint_dates
  ),
  runs as (
    select max(d) as run_end, count(*) as run_length
    from islands
    group by grp
  )
  select
    coalesce(max(run_length), 0),
    (select run_length from runs order by run_end desc limit 1),
    (select max(run_end) from runs)
  into v_longest, v_current, v_last_date
  from runs;

  if v_last_date is null or v_last_date < current_date - 1 then
    v_current := 0;
  end if;

  insert into public.chat_streaks (user_a_id, user_b_id, current_streak, longest_streak, last_joint_date, updated_at)
  values (v_a, v_b, coalesce(v_current, 0), coalesce(v_longest, 0), v_last_date, now())
  on conflict (user_a_id, user_b_id) do update
    set current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        last_joint_date = excluded.last_joint_date,
        updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- recover_chat_streak(): called by the client via
-- supabase.rpc('recover_chat_streak', { p_other_user_id }). Enforces the
-- caller's own premium status, mutual follow with the other participant,
-- lapse eligibility, and the pair-scoped 7-day rate limit server-side, then
-- bridges the gap and returns the recomputed chat_streaks row.
-- ---------------------------------------------------------------------------
create or replace function public.recover_chat_streak(p_other_user_id uuid)
returns public.chat_streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_last date;
  v_bridge_end date := current_date - 1;
  v_result public.chat_streaks;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if v_uid = p_other_user_id then
    raise exception 'Invalid conversation' using errcode = 'P0001';
  end if;

  if not public.is_premium(v_uid) then
    raise exception 'Joint streak restoral is a premium feature' using errcode = 'P0001';
  end if;

  if not (
    exists (
      select 1 from public.follows
      where follower_id = v_uid and following_id = p_other_user_id
    )
    and exists (
      select 1 from public.follows
      where follower_id = p_other_user_id and following_id = v_uid
    )
  ) then
    raise exception 'You can only restore a streak with someone who mutually follows you' using errcode = 'P0001';
  end if;

  v_a := least(v_uid, p_other_user_id);
  v_b := greatest(v_uid, p_other_user_id);

  select last_joint_date into v_last
  from public.chat_streaks
  where user_a_id = v_a and user_b_id = v_b;

  if v_last is null then
    raise exception 'You have no joint streak to restore' using errcode = 'P0001';
  end if;

  -- Still active (joint activity today or yesterday): nothing to bridge.
  if v_last >= current_date - 1 then
    raise exception 'Your joint streak is still active' using errcode = 'P0001';
  end if;

  -- Only a 1-2 day lapse can be bridged (last joint activity no older than 3 days).
  if v_last < current_date - 3 then
    raise exception 'This joint streak lapsed too long ago to restore' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.chat_streak_recoveries
    where user_a_id = v_a and user_b_id = v_b
      and created_at > now() - interval '7 days'
  ) then
    raise exception 'This chat has already used its joint streak restoral in the last 7 days' using errcode = 'P0001';
  end if;

  insert into public.chat_streak_recoveries (user_a_id, user_b_id, recovered_by, bridge_start, bridge_end)
  values (v_a, v_b, v_uid, v_last + 1, v_bridge_end);

  perform public.recompute_chat_streak(v_a, v_b);

  select * into v_result from public.chat_streaks where user_a_id = v_a and user_b_id = v_b;
  return v_result;
end;
$$;

grant execute on function public.recover_chat_streak(uuid) to authenticated;
