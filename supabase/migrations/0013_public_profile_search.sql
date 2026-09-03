-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Lets signed-in users search for and view other users' public profile info
-- (the Connect tab). No email or other private data lives on this table --
-- email is only ever in auth.users -- so a row-level policy is sufficient;
-- every column already on public.profiles is safe to expose.

drop policy if exists "Authenticated users can view public profiles" on public.profiles;
create policy "Authenticated users can view public profiles"
  on public.profiles for select
  to authenticated
  using (onboarded = true);
