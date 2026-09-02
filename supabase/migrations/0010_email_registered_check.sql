-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
--
-- Lets the sign-up form tell a user their email is already taken.
--
-- With "Confirm email" enabled, supabase.auth.signUp() deliberately does NOT
-- error for an already-registered address (Supabase's anti-enumeration
-- behaviour) — it just silently resends a confirmation. That leaves the user
-- staring at a "check your inbox" screen for an account they can't create.
--
-- This is a deliberate, owner-approved trade-off: we expose a narrow
-- email-exists oracle so the form can say "log in instead". The function
-- returns only a boolean, is SECURITY DEFINER so it can read auth.users, and
-- is the single source of that signal. Sign-up traffic is rate-limited by
-- Supabase Auth, which bounds how fast the oracle can be probed.

create or replace function public.email_registered(email_input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(email_input))
  );
$$;

-- Callable before the user has a session (anon) and after (authenticated).
grant execute on function public.email_registered(text) to anon, authenticated;
