-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle,
-- AFTER migration 0006 (needs public.is_premium).
--
-- Streak recovery (premium feature): a user who lapsed their streak by 1-2 days
-- can bridge the gap once per rolling 30 days. Each recovery records the
-- inclusive range of missed days; public.recompute_streak then treats those
-- days as active alongside real workout_logs, so the run reconnects.
--
-- workout_logs is left untouched so analytics stays honest — the bridge lives
-- only in streak_recoveries and only affects streak math.

create table if not exists public.streak_recoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bridge_start date not null,
  bridge_end date not null,
  created_at timestamptz not null default now()
);

create index if not exists streak_recoveries_user_id_idx on public.streak_recoveries (user_id);

alter table public.streak_recoveries enable row level security;

-- Read-only for the owner; the only writer is public.recover_streak() below.
drop policy if exists "Users can view own streak recoveries" on public.streak_recoveries;
create policy "Users can view own streak recoveries"
  on public.streak_recoveries for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Redefinition of public.recompute_streak (originally migration 0002) that
-- unions bridged recovery days into the set of active days. Everything else
-- about the function is unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_longest integer;
  v_last_date date;
begin
  with dates as (
    select distinct logged_date as d
    from public.workout_logs
    where user_id = p_user_id
    union
    select gs::date
    from public.streak_recoveries sr
    cross join lateral generate_series(sr.bridge_start, sr.bridge_end, interval '1 day') as gs
    where sr.user_id = p_user_id
  ),
  islands as (
    -- Consecutive dates share the same (date - row_number) value.
    select d, d - (row_number() over (order by d))::integer as grp
    from dates
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

  insert into public.streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
  values (p_user_id, coalesce(v_current, 0), coalesce(v_longest, 0), v_last_date, now())
  on conflict (user_id) do update
    set current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        last_activity_date = excluded.last_activity_date,
        updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- recover_streak(): called by the client via supabase.rpc('recover_streak').
-- Enforces premium + eligibility + the 30-day rate limit server-side, then
-- bridges the gap and returns the recomputed streak row.
-- ---------------------------------------------------------------------------
create or replace function public.recover_streak()
returns public.streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_last date;
  v_bridge_end date := current_date - 1;
  v_result public.streaks;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if not public.is_premium(v_uid) then
    raise exception 'Streak recovery is a premium feature' using errcode = 'P0001';
  end if;

  select last_activity_date into v_last
  from public.streaks
  where user_id = v_uid;

  if v_last is null then
    raise exception 'You have no streak to recover' using errcode = 'P0001';
  end if;

  -- Still active (activity today or yesterday): nothing to bridge.
  if v_last >= current_date - 1 then
    raise exception 'Your streak is still active' using errcode = 'P0001';
  end if;

  -- Only a 1-2 day lapse can be bridged (last activity no older than 3 days).
  if v_last < current_date - 3 then
    raise exception 'This streak lapsed too long ago to recover' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.streak_recoveries
    where user_id = v_uid
      and created_at > now() - interval '30 days'
  ) then
    raise exception 'You have already used a streak recovery in the last 30 days' using errcode = 'P0001';
  end if;

  insert into public.streak_recoveries (user_id, bridge_start, bridge_end)
  values (v_uid, v_last + 1, v_bridge_end);

  perform public.recompute_streak(v_uid);

  select * into v_result from public.streaks where user_id = v_uid;
  return v_result;
end;
$$;

grant execute on function public.recover_streak() to authenticated;
