-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Adds workout plans, workout logs, streak tracking, and habit check-ins.

-- ---------------------------------------------------------------------------
-- workout_plans: templates a user builds ("Push Day", "Full Body", ...)
-- ---------------------------------------------------------------------------
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  workout_type text check (workout_type in ('home', 'gym', 'both')),
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_plans_user_id_idx on public.workout_plans (user_id);

alter table public.workout_plans enable row level security;

create policy "Users can view own workout plans"
  on public.workout_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own workout plans"
  on public.workout_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workout plans"
  on public.workout_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete own workout plans"
  on public.workout_plans for delete
  using (auth.uid() = user_id);

create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workout_logs: a completed workout on a given calendar day
-- ---------------------------------------------------------------------------
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  name text not null,
  logged_date date not null default current_date,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workout_logs_user_id_date_idx on public.workout_logs (user_id, logged_date);

alter table public.workout_logs enable row level security;

create policy "Users can view own workout logs"
  on public.workout_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own workout logs"
  on public.workout_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workout logs"
  on public.workout_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own workout logs"
  on public.workout_logs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- streaks: one row per user, fully derived from workout_logs (see trigger below)
-- ---------------------------------------------------------------------------
create table if not exists public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

alter table public.streaks enable row level security;

create policy "Users can view own streak"
  on public.streaks for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies: streaks is only ever written by the
-- security-definer trigger below, never directly by a client.

-- ---------------------------------------------------------------------------
-- habit_checkins: a lightweight daily "showed up" check-in, one per day
-- ---------------------------------------------------------------------------
create table if not exists public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

alter table public.habit_checkins enable row level security;

create policy "Users can view own check-ins"
  on public.habit_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert own check-ins"
  on public.habit_checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own check-ins"
  on public.habit_checkins for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Streak logic
--
-- current_streak / longest_streak are recomputed from scratch from the set of
-- distinct workout_logs.logged_date values every time a log is inserted,
-- updated, or deleted. Recomputing from the full history (rather than just
-- incrementing a counter) keeps it correct no matter the order logs arrive
-- in, including backfilled dates and deleted logs:
--
--   - Multiple logs on the same day only count once.
--   - A gap of exactly one day continues the run (today after yesterday).
--   - A gap of more than one day breaks the run.
--   - current_streak is 0 unless the most recent logged day is today or
--     yesterday (a run that ended two or more days ago is a dead streak,
--     even though it still counts toward longest_streak).
--   - longest_streak is the longest run found anywhere in the history.
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
  -- `runs` is a CTE, so it only exists within this one statement — both the
  -- longest-run aggregate and the most-recent-run lookup have to happen here.
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

create or replace function public.workout_logs_streak_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_streak(old.user_id);
    return old;
  end if;

  perform public.recompute_streak(new.user_id);
  return new;
end;
$$;

create trigger workout_logs_streak
  after insert or update or delete on public.workout_logs
  for each row
  execute function public.workout_logs_streak_trigger();
