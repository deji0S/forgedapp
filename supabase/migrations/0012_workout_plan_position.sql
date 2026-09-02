-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
--
-- Adds a per-user ordering to workout_plans so the Workouts tab can be
-- reordered (up/down arrows) and the order survives reloads. Lower position
-- sorts first. New plans are appended (max position + 1) by
-- src/lib/tracking.ts::createWorkoutPlan.
--
-- The column add + one-time backfill are wrapped in a guard so re-running
-- this migration never clobbers a user's hand-picked order. The backfill
-- seeds position from the previous sort (created_at, newest first).

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_plans'
      and column_name = 'position'
  ) then
    alter table public.workout_plans add column position integer not null default 0;

    with ordered as (
      select id,
             row_number() over (partition by user_id order by created_at desc) - 1 as pos
      from public.workout_plans
    )
    update public.workout_plans p
    set position = ordered.pos
    from ordered
    where p.id = ordered.id;
  end if;
end $$;

create index if not exists workout_plans_user_position_idx
  on public.workout_plans (user_id, position);
