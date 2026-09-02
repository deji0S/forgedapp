-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
--
-- The sign-up form now collects a required username. It is passed through
-- supabase.auth.signUp({ options: { data: { username } } }) into
-- auth.users.raw_user_meta_data, and this migration wires up the rest:
--
--   * profiles gains an `onboarded` flag. Until now "a profiles row exists"
--     was the signal that a user finished onboarding; that no longer holds
--     because we create the row at account creation (to claim the username),
--     so the flag becomes the real signal. Existing rows are all onboarded.
--
--   * A trigger on auth.users insert creates the profiles row immediately,
--     carrying the chosen username. The onboarding columns get throwaway
--     placeholder values (overwritten when the user actually onboards) so the
--     existing NOT NULL + CHECK constraints stay intact. The partial unique
--     index from migration 0008 (profiles_username_unique_idx) enforces
--     uniqueness; a collision aborts the auth.users insert, so signUp errors.
--
--   * username_available() lets the form check a handle before submitting,
--     mirroring email_registered() from migration 0010.

-- --- onboarded flag -------------------------------------------------------

alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- Every pre-existing profiles row belongs to a user who completed onboarding.
update public.profiles set onboarded = true where onboarded = false;

-- --- create the profiles row (with username) at account creation ---------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := nullif(lower(trim(new.raw_user_meta_data->>'username')), '');
begin
  insert into public.profiles (id, username, fitness_level, goal, workout_type, days_per_week, onboarded)
  values (new.id, v_username, 'beginner', 'general_fitness', 'both', 3, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- pre-submit availability check --------------------------------------

create or replace function public.username_available(username_input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where username = lower(trim(username_input))
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;
