-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Lets signed-in users see another user's current/longest streak on their
-- public profile (mirrors the "Authenticated users can view public
-- profiles" policy from 0013_public_profile_search.sql: same audience,
-- same onboarded-only gate, just for the streaks table instead of profiles).
-- The existing "Users can view own streak" policy from 0002 stays -- RLS
-- combines multiple permissive select policies with OR, so this only adds
-- visibility, it doesn't take any away.

drop policy if exists "Authenticated users can view public streaks" on public.streaks;
create policy "Authenticated users can view public streaks"
  on public.streaks for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = streaks.user_id
        and profiles.onboarded = true
    )
  );
