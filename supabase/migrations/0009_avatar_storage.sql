-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Adds profile picture support: an avatar_url column on profiles, plus a
-- public "avatars" storage bucket where each user can only write inside
-- their own <user_id>/ folder.

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket, so reads work without these policies too, but RLS is
-- enabled on storage.objects project-wide -- an explicit select policy is
-- what actually lets the public URL serve the file.
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Files are keyed <user_id>/avatar.jpg; storage.foldername(name) splits the
-- object path on '/', so [1] is that leading user_id segment.
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
