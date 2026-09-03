-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Joint chat streaks between mutual-follow chat participants: increments
-- when both people have opened the specific chat on a given calendar day,
-- resets if either misses a day. Directly reuses the personal-streak
-- pattern from migration 0002 (workout_logs -> streaks): a raw per-day
-- activity table, and a fully-derived streak table recomputed from scratch
-- by a security-definer trigger using the same date-island/run-length CTE.

-- ---------------------------------------------------------------------------
-- chat_opens: one row per (user, conversation partner, day) the chat was
-- opened. Analogous to habit_checkins, scoped per conversation.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  other_user_id uuid not null references auth.users (id) on delete cascade,
  opened_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, other_user_id, opened_date),
  constraint chat_opens_no_self check (user_id <> other_user_id)
);

create index if not exists chat_opens_pair_idx on public.chat_opens (user_id, other_user_id);

alter table public.chat_opens enable row level security;

drop policy if exists "Users can view own chat opens" on public.chat_opens;
create policy "Users can view own chat opens"
  on public.chat_opens for select
  using (auth.uid() = user_id);

-- Mirrors the messages/chat-media insert policies: only as yourself, and
-- only for a conversation partner who mutually follows you.
drop policy if exists "Mutual followers can record own chat opens" on public.chat_opens;
create policy "Mutual followers can record own chat opens"
  on public.chat_opens for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.follows f1
      where f1.follower_id = auth.uid() and f1.following_id = other_user_id
    )
    and exists (
      select 1 from public.follows f2
      where f2.follower_id = other_user_id and f2.following_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- chat_streaks: one row per unordered pair, fully derived from chat_opens
-- (see the trigger below). Analogous to streaks (one row per user).
-- ---------------------------------------------------------------------------
create table if not exists public.chat_streaks (
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_joint_date date,
  updated_at timestamptz not null default now(),
  primary key (user_a_id, user_b_id),
  constraint chat_streaks_ordered check (user_a_id < user_b_id)
);

alter table public.chat_streaks enable row level security;

drop policy if exists "Users can view own chat streaks" on public.chat_streaks;
create policy "Users can view own chat streaks"
  on public.chat_streaks for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- No insert/update/delete policies: chat_streaks is only ever written by the
-- security-definer trigger below, never directly by a client.

-- ---------------------------------------------------------------------------
-- Joint streak logic -- same island/run-length approach as
-- public.recompute_streak (migration 0002), applied to the INTERSECTION of
-- the two participants' opened_date sets instead of one user's dates. A day
-- either person skipped is simply absent from that intersection, which
-- breaks the run exactly the way a missed day breaks a personal streak --
-- no separate "reset" logic needed.
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

create or replace function public.chat_opens_streak_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_chat_streak(new.user_id, new.other_user_id);
  return new;
end;
$$;

drop trigger if exists chat_opens_streak on public.chat_opens;
create trigger chat_opens_streak
  after insert on public.chat_opens
  for each row
  execute function public.chat_opens_streak_trigger();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_streaks'
  ) then
    alter publication supabase_realtime add table public.chat_streaks;
  end if;
end $$;
