-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Adds a public handle (username) and a friendly display name to profiles.
-- username is a unique lowercase handle; display_name is a freeform name shown on-screen.

alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text;

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$');

alter table public.profiles
  drop constraint if exists profiles_display_name_length;
alter table public.profiles
  add constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 60);

-- Partial index so multiple users can have a null username (not chosen yet)
-- while any username that IS set must be unique.
create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;
