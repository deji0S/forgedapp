-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Lets a workout be shared into a chat as a distinct message type. Stored as
-- a jsonb snapshot of the workout's name/exercises at share time -- not a
-- live FK to workout_plans -- so a shared message keeps rendering correctly
-- even after the sender later edits, reorders, or deletes that workout.
-- Delivery/visibility piggybacks entirely on the existing messages RLS
-- (migrations 0015/0023): it's still a plain insert into public.messages by
-- the sender to a mutual-follow, non-blocked recipient, and the select
-- policy already reads whole rows, so no RLS changes are needed here.

alter table public.messages
  add column if not exists shared_workout jsonb;

alter table public.messages
  drop constraint if exists messages_shared_workout_shape_check;
alter table public.messages
  add constraint messages_shared_workout_shape_check
    check (
      shared_workout is null
      or (
        jsonb_typeof(shared_workout -> 'name') = 'string'
        and jsonb_typeof(shared_workout -> 'exercises') = 'array'
      )
    );

alter table public.messages
  drop constraint if exists messages_has_content_check;
alter table public.messages
  add constraint messages_has_content_check
    check (body is not null or media_path is not null or shared_workout is not null);
