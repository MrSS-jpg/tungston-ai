-- ─────────────────────────────────────────────────────────────
-- TUNGSTON AI // PRODUCTION SUPABASE SCHEMA & RLS POLICIES
-- Checklist Items: 9 (Migrations & Safety), 10 (RLS), 18 (Cascade Deletes)
-- ─────────────────────────────────────────────────────────────

-- 1. Enable required cryptographic extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. User Profiles Table (Mirrors auth.users with cascade deletion)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  tier text default 'member' check (tier in ('guest', 'member', 'byok', 'admin')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Projects Table
create table if not exists public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  files jsonb default '[]'::jsonb not null,
  created_at bigint not null
);

-- 4. Conversations Table (Optional Cloud Sync for Authenticated Members)
create table if not exists public.conversations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New chat',
  messages jsonb default '[]'::jsonb not null,
  project_id text references public.projects(id) on delete set null,
  created_at bigint not null,
  updated_at bigint not null
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;

-- Profiles: Users can view and update only their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Projects: Strict isolation per authenticated user
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Conversations: Strict isolation per authenticated user
create policy "Users can view own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, tier, created_at, updated_at)
  values (new.id, new.email, 'member', now(), now())
  on conflict (id) do update
  set email = excluded.email, updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- SECURE CASCADE USER DELETION FUNCTION (RPC)
-- ─────────────────────────────────────────────────────────────

create or replace function public.delete_user_account()
returns void as $$
declare
  requesting_user_id uuid;
begin
  requesting_user_id := auth.uid();
  if requesting_user_id is null then
    raise exception 'Unauthenticated call to delete_user_account.';
  end if;

  -- Delete associated projects and conversations (cascade also handles this)
  delete from public.projects where user_id = requesting_user_id;
  delete from public.conversations where user_id = requesting_user_id;
  delete from public.profiles where id = requesting_user_id;

  -- Delete auth user record
  delete from auth.users where id = requesting_user_id;
end;
$$ language plpgsql security definer;
