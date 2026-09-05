-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
--
-- Adds a duration_ms column to workout_logs so the Progress tab can show how
-- long each recent workout took. Populated at completion time from the
-- per-exercise stopwatch total on the active workout screen
-- (src/pages/WorkoutDetail.tsx); null for logs completed before this existed.

alter table public.workout_logs add column if not exists duration_ms bigint;
