-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
--
-- Report: lets a user flag another user, or a specific message (attachments
-- live on the message row itself -- see migration 0016 -- so a message_id is
-- enough to reference one), for abuse/harassment/illegal content. There's no
-- moderator role or admin UI yet, so review happens via the SQL editor /
-- dashboard using the service role, which bypasses RLS entirely -- the point
-- of this table is just that reports land somewhere durable instead of
-- being silently discarded.
--
-- Block: prevents messaging and hides each party from the other's search,
-- in both directions, enforced at the RLS layer (not just in the UI) so it
-- can't be bypassed by calling the API directly.

-- --- reports --------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  -- Nullable + ON DELETE SET NULL (not CASCADE) on both sides: a report is a
  -- moderation record, and either party -- including the person BEING
  -- reported -- can delete their own account at any time (self-serve
  -- deletion, migration "delete-account" edge function). The report must
  -- survive that, or a bad actor could erase the evidence against them
  -- simply by deleting their account.
  reporter_id uuid references auth.users (id) on delete set null,
  reported_user_id uuid references auth.users (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  reason text not null check (reason in ('abuse', 'harassment', 'illegal_content', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  -- Written as "either side is null, or they differ" (not a plain <>) so
  -- this doesn't get re-evaluated to a violation if both foreign keys are
  -- later nulled out independently by the ON DELETE SET NULL actions above.
  constraint reports_no_self_report check (
    reporter_id is null or reported_user_id is null or reporter_id <> reported_user_id
  )
);

create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id, created_at desc);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);

alter table public.reports enable row level security;

-- Insert: only as yourself.
drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Select: only the reports you filed (so the UI can confirm "you already
-- reported this"). Nobody can read reports made about them -- reviewing
-- them is a service-role/dashboard task, not an app feature.
drop policy if exists "Users can view own filed reports" on public.reports;
create policy "Users can view own filed reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- No update/delete policy: reports are immutable once filed.

-- A report that references a message must actually be about that message:
-- the reporter must be one of its two participants (so they could see it in
-- the first place), and the reported user must be the other participant.
-- Only checked on insert -- this must not fire again when the FK actions
-- above later null out message_id/reporter_id/reported_user_id on account
-- deletion, which is exactly why it's a BEFORE INSERT trigger, not a CHECK.
create or replace function public.validate_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.message_id is not null then
    if not exists (
      select 1 from public.messages m
      where m.id = new.message_id
        and (m.sender_id = new.reporter_id or m.recipient_id = new.reporter_id)
        and (m.sender_id = new.reported_user_id or m.recipient_id = new.reported_user_id)
        and new.reporter_id <> new.reported_user_id
    ) then
      raise exception 'message_id must reference a message between the reporter and reported user';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_validate on public.reports;
create trigger reports_validate
  before insert on public.reports
  for each row execute function public.validate_report();

-- --- blocks -----------------------------------------------------------------

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  -- Snapshot of the blocked user's public label at block time, so the
  -- "Blocked accounts" list in Settings can display it without needing to
  -- read public.profiles -- which the policy below deliberately hides a
  -- blocked user from, in both directions, so there'd otherwise be no way
  -- to show who you'd blocked in order to unblock them.
  blocked_username text,
  blocked_display_name text,
  blocked_avatar_url text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Read access is scoped to relationships the caller is a party to, same
-- shape as follows' select policy (migration 0014) -- enough to list who
-- you've blocked and, for the policies below, to check "is there a block
-- between us" from either side.
drop policy if exists "Users can view own block relationships" on public.blocks;
create policy "Users can view own block relationships"
  on public.blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users can insert own blocks" on public.blocks;
create policy "Users can insert own blocks"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

-- Unblocking is a plain delete under this policy -- no RPC needed.
drop policy if exists "Users can delete own blocks" on public.blocks;
create policy "Users can delete own blocks"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- block_user(): records the block and severs any existing follow
-- relationship between the two users, in both directions, in one
-- transaction -- SECURITY DEFINER because deleting the OTHER person's
-- "follows you" row is otherwise outside what the caller's own RLS on
-- follows (migration 0014) permits.
create or replace function public.block_user(
  p_target_id uuid,
  p_username text default null,
  p_display_name text default null,
  p_avatar_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if v_uid = p_target_id then
    raise exception 'Cannot block yourself' using errcode = 'P0001';
  end if;

  insert into public.blocks (blocker_id, blocked_id, blocked_username, blocked_display_name, blocked_avatar_url)
  values (v_uid, p_target_id, p_username, p_display_name, p_avatar_url)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.follows
  where (follower_id = v_uid and following_id = p_target_id)
     or (follower_id = p_target_id and following_id = v_uid);
end;
$$;

grant execute on function public.block_user(uuid, text, text, text) to authenticated;

-- --- enforce blocks on profiles, messages, and follows -----------------------

-- Search/profile visibility: hide either party from the other, in both
-- directions. "Users can view own profile" (migration 0001) is a separate
-- policy and unaffected, so you can always see your own profile even
-- though you can never be blocked by (or block) yourself.
drop policy if exists "Authenticated users can view public profiles" on public.profiles;
create policy "Authenticated users can view public profiles"
  on public.profiles for select
  to authenticated
  using (
    onboarded = true
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = profiles.id)
         or (b.blocker_id = profiles.id and b.blocked_id = auth.uid())
    )
  );

-- Messaging: a block in either direction stops new sends, on top of the
-- existing mutual-follow requirement. (block_user() above already tears
-- down any existing follow between the pair, so this is belt-and-braces
-- for the case where a follow gets re-established some other way.)
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
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = recipient_id)
         or (b.blocker_id = recipient_id and b.blocked_id = auth.uid())
    )
  );

-- Following: can't start following someone you've blocked or who's blocked
-- you (existing follows between a pair are already deleted the moment
-- either blocks the other, via block_user() above).
drop policy if exists "Users can insert own follow relationships" on public.follows;
create policy "Users can insert own follow relationships"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = following_id)
         or (b.blocker_id = following_id and b.blocked_id = auth.uid())
    )
  );
