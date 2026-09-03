-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Photo/video attachments on chat messages, stored in a private "chat-media"
-- bucket. Bucket-level file_size_limit is a 50MB hard backstop (matching the
-- video limit); the finer-grained 10MB photo limit is enforced client-side
-- before upload, since Storage buckets only support one blanket size cap.

-- --- messages: allow a body-less message when it carries an attachment ----

alter table public.messages
  alter column body drop not null;

alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  add column if not exists media_path text,
  add column if not exists media_type text,
  add column if not exists media_mime text;

alter table public.messages
  drop constraint if exists messages_body_length_check;
alter table public.messages
  add constraint messages_body_length_check
    check (body is null or char_length(body) between 1 and 2000);

alter table public.messages
  drop constraint if exists messages_media_type_check;
alter table public.messages
  add constraint messages_media_type_check
    check (media_type is null or media_type in ('image', 'video'));

alter table public.messages
  drop constraint if exists messages_media_fields_consistent_check;
alter table public.messages
  add constraint messages_media_fields_consistent_check
    check ((media_path is null) = (media_type is null));

alter table public.messages
  drop constraint if exists messages_has_content_check;
alter table public.messages
  add constraint messages_has_content_check
    check (body is not null or media_path is not null);

-- --- chat-media bucket ------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are keyed <sender_id>/<recipient_id>/<uuid>.<ext>; storage.foldername
-- splits the path on '/', so [1] is the sender and [2] the recipient.

drop policy if exists "Chat media readable by conversation participants" on storage.objects;
create policy "Chat media readable by conversation participants"
  on storage.objects for select
  using (
    bucket_id = 'chat-media'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or auth.uid()::text = (storage.foldername(name))[2]
    )
  );

-- Mirrors the messages insert policy: only as yourself, and only to someone
-- who mutually follows you. Each `exists` subquery reads `follows` under its
-- own RLS as the current user, same as messages' insert policy.
drop policy if exists "Mutual followers can upload chat media" on storage.objects;
create policy "Mutual followers can upload chat media"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.follows f1
      where f1.follower_id = auth.uid()
        and f1.following_id = ((storage.foldername(name))[2])::uuid
    )
    and exists (
      select 1 from public.follows f2
      where f2.follower_id = ((storage.foldername(name))[2])::uuid
        and f2.following_id = auth.uid()
    )
  );
