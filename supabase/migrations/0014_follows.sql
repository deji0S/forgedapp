-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- Follow relationships for the Connect tab's Follow button.

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

-- Read access is scoped to relationships the caller is a party to (as
-- follower or followee) -- enough to compute "do I follow them" / "do they
-- follow me" for a profile view, without exposing the whole social graph.
drop policy if exists "Users can view own follow relationships" on public.follows;
create policy "Users can view own follow relationships"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "Users can insert own follow relationships" on public.follows;
create policy "Users can insert own follow relationships"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users can delete own follow relationships" on public.follows;
create policy "Users can delete own follow relationships"
  on public.follows for delete
  using (auth.uid() = follower_id);
