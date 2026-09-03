-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Direct messages between mutual followers, with realtime delivery.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists messages_sender_recipient_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_recipient_sender_idx on public.messages (recipient_id, sender_id, created_at);

alter table public.messages enable row level security;

-- Read: only the two participants. Deliberately does not re-check live
-- mutual-follow status, so history survives an unfollow -- only new sends
-- require mutual follow (see the insert policy below).
drop policy if exists "Participants can view their messages" on public.messages;
create policy "Participants can view their messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Write: only as yourself, and only to someone who mutually follows you.
-- Each `exists` subquery is itself subject to follows' own RLS as the
-- current user (not security definer) -- and is readable under that policy
-- because auth.uid() appears as one of the two matched columns in each case.
drop policy if exists "Mutual followers can send messages" on public.messages;
create policy "Mutual followers can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.follows f1
      where f1.follower_id = auth.uid() and f1.following_id = recipient_id
    )
    and exists (
      select 1 from public.follows f2
      where f2.follower_id = recipient_id and f2.following_id = auth.uid()
    )
  );

-- No update/delete policy: messages are immutable and unsendable for now.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
