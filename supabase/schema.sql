-- ============================================================================
-- SIDENOTES ATELIER — IDEMPOTENT SUPABASE SQL SCHEMA
-- Run this script manually in the Supabase SQL Editor when enabling cloud sync.
-- Safe to run multiple times (idempotent).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (User identity, display name, avatar)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Automatic profile creation on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Atelier Scribe'),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. SPACES (NOTEBOOKS) TABLE
-- ============================================================================
create table if not exists public.spaces (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'personal',
  description text,
  icon_name text not null default 'book-open',
  cover_style text default 'klein',
  custom_color text,
  font_choice text default 'editorial',
  is_shared boolean not null default false,
  invite_code text,
  partner_name text,
  members_count integer default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 3. FIELD NOTES (NOTICES & MARGINALIA) TABLE
-- ============================================================================
create table if not exists public.field_notes (
  id text primary key,
  space_id text not null references public.spaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  content text not null default '',
  text_align text default 'left',
  location_name text,
  photos jsonb default '[]'::jsonb,
  voice_memo jsonb,
  tags jsonb default '[]'::jsonb,
  pinned boolean not null default false,
  photostrip_layout text default 'strip',
  marginalia text,
  quote_source text,
  marginalia_items jsonb default '[]'::jsonb,
  highlights jsonb default '[]'::jsonb,
  author jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================================
create index if not exists idx_spaces_user_id on public.spaces(user_id);
create index if not exists idx_field_notes_space_id on public.field_notes(space_id);
create index if not exists idx_field_notes_created_at on public.field_notes(created_at desc);
create index if not exists idx_field_notes_pinned on public.field_notes(pinned) where pinned = true;

-- ============================================================================
-- 5. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_spaces_updated_at on public.spaces;
create trigger trg_spaces_updated_at
before update on public.spaces
for each row execute function public.set_updated_at();

drop trigger if exists trg_field_notes_updated_at on public.field_notes;
create trigger trg_field_notes_updated_at
before update on public.field_notes
for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES FOR SPACES & NOTES
-- ============================================================================
alter table public.spaces enable row level security;
alter table public.field_notes enable row level security;

-- Spaces Policies
drop policy if exists "Users can view their own spaces" on public.spaces;
create policy "Users can view their own spaces"
  on public.spaces for select
  using (auth.uid() = user_id or is_shared = true);

drop policy if exists "Users can insert their own spaces" on public.spaces;
create policy "Users can insert their own spaces"
  on public.spaces for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own spaces" on public.spaces;
create policy "Users can update their own spaces"
  on public.spaces for update
  using (auth.uid() = user_id or is_shared = true);

drop policy if exists "Users can delete their own spaces" on public.spaces;
create policy "Users can delete their own spaces"
  on public.spaces for delete
  using (auth.uid() = user_id);

-- Field Notes Policies
drop policy if exists "Users can view notes in accessible spaces" on public.field_notes;
create policy "Users can view notes in accessible spaces"
  on public.field_notes for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.spaces s
      where s.id = field_notes.space_id and (s.user_id = auth.uid() or s.is_shared = true)
    )
  );

drop policy if exists "Users can insert notes in accessible spaces" on public.field_notes;
create policy "Users can insert notes in accessible spaces"
  on public.field_notes for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.spaces s
      where s.id = field_notes.space_id and (s.user_id = auth.uid() or s.is_shared = true)
    )
  );

drop policy if exists "Users can update notes in accessible spaces" on public.field_notes;
create policy "Users can update notes in accessible spaces"
  on public.field_notes for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.spaces s
      where s.id = field_notes.space_id and (s.user_id = auth.uid() or s.is_shared = true)
    )
  );

drop policy if exists "Users can delete notes in accessible spaces" on public.field_notes;
create policy "Users can delete notes in accessible spaces"
  on public.field_notes for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.spaces s
      where s.id = field_notes.space_id and (s.user_id = auth.uid() or s.is_shared = true)
    )
  );

-- ============================================================================
-- 7. STORAGE BUCKET FOR MEDIA & AVATARS (OPTIONAL / SAFE EXECUTION)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('atelier_media', 'atelier_media', true)
on conflict (id) do nothing;

drop policy if exists "Public media bucket access" on storage.objects;
create policy "Public media bucket access"
  on storage.objects for select
  using (bucket_id = 'atelier_media');

drop policy if exists "Authenticated users can upload media" on storage.objects;
create policy "Authenticated users can upload media"
  on storage.objects for insert
  with check (bucket_id = 'atelier_media' and auth.role() = 'authenticated');
