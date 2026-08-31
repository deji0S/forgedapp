-- Run this in the Supabase SQL editor (Project > SQL Editor) for project bozzojpwswuvbmqazvle.
-- One row per user, created once they finish onboarding.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  fitness_level text not null check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  goal text not null check (goal in ('lose_weight', 'build_muscle', 'improve_endurance', 'general_fitness')),
  workout_type text not null check (workout_type in ('home', 'gym', 'both')),
  days_per_week smallint not null check (days_per_week between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
