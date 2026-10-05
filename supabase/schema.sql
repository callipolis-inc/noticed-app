-- ============================================================================
-- SIDENOTES ATELIER — IDEMPOTENT SUPABASE SQL SCHEMA
-- Run this script manually in the Supabase SQL Editor when enabling cloud sync.
-- Safe to run multiple times (idempotent).
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. SPACES (NOTEBOOKS) TABLE
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

-- 2. FIELD NOTES (NOTICES) TABLE
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

-- 3. INDEXES FOR FAST CHRONOLOGICAL & NOTEBOOK QUERIES
create index if not exists idx_spaces_user_id on public.spaces(user_id);
create index if not exists idx_field_notes_space_id on public.field_notes(space_id);
create index if not exists idx_field_notes_created_at on public.field_notes(created_at desc);
create index if not exists idx_field_notes_pinned on public.field_notes(pinned) where pinned = true;

-- 4. AUTOMATIC UPDATED_AT TRIGGER
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_spaces_updated_at on public.spaces;
create trigger trg_spaces_updated_at
before update on public.spaces
for each row execute function public.set_updated_at();

drop trigger if exists trg_field_notes_updated_at on public.field_notes;
create trigger trg_field_notes_updated_at
before update on public.field_notes
for each row execute function public.set_updated_at();

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.spaces enable row level security;
alter table public.field_notes enable row level security;

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
