-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Read receipts: a nullable read_at, set once the recipient has opened the
-- conversation. Marked via a direct client-side update (not an RPC), so the
-- RLS update policy is the entire gate: a user may only update rows where
-- they are the recipient -- never rows they sent themselves.
--
-- messages has had no update policy until now (messages are otherwise
-- immutable), so table-level UPDATE privilege was inert. Adding a policy
-- makes it live, so we also narrow the grant to the read_at column only --
-- otherwise a recipient's RLS-permitted update could rewrite the body/media
-- of a message sent to them, which is a real integrity concern the read-
-- receipt feature shouldn't introduce as a side effect.

alter table public.messages
  add column if not exists read_at timestamptz;

drop policy if exists "Recipients can mark messages as read" on public.messages;
create policy "Recipients can mark messages as read"
  on public.messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;
