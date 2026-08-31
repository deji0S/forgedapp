-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Adds a feedback field to workout_logs and a table for post-workout check-ins.

alter table public.workout_logs
  add column if not exists feedback text;

-- workout_insights: one check-in message + adaptation suggestion per
-- completed workout. Generated client-side (src/lib/checkin.ts) from a pool
-- of pre-written messages, picked using the feedback trend on recent logs.
create table if not exists public.workout_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  message text not null,
  suggestion text not null,
  created_at timestamptz not null default now(),
  unique (workout_log_id)
);

create index if not exists workout_insights_user_id_idx on public.workout_insights (user_id);

alter table public.workout_insights enable row level security;

create policy "Users can view own workout insights"
  on public.workout_insights for select
  using (auth.uid() = user_id);

create policy "Users can insert own workout insights"
  on public.workout_insights for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workout insights"
  on public.workout_insights for update
  using (auth.uid() = user_id);
