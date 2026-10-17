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
  is_pro boolean not null default false,
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
  foil_color text,
  font_choice text default 'editorial',
  is_shared boolean not null default false,
  invite_code text,
  partner_name text,
  members_count integer default 1,
  default_role text not null default 'editor',
  archived boolean not null default false,
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
  photos_meta jsonb default '[]'::jsonb,
  videos jsonb default '[]'::jsonb,
  voice_memo jsonb,
  tags jsonb default '[]'::jsonb,
  pinned boolean not null default false,
  archived boolean not null default false,
  image_position text default 'bottom',
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
create index if not exists idx_spaces_invite_code on public.spaces(invite_code) where invite_code is not null;
create index if not exists idx_spaces_archived on public.spaces(user_id, archived);

create index if not exists idx_field_notes_space_id on public.field_notes(space_id);
create index if not exists idx_field_notes_user_id on public.field_notes(user_id);
create index if not exists idx_field_notes_created_at on public.field_notes(created_at desc);
create index if not exists idx_field_notes_pinned on public.field_notes(pinned) where pinned = true;
create index if not exists idx_field_notes_archived on public.field_notes(space_id, archived) where archived = true;

-- ============================================================================
-- 4. SPACE MEMBERS (COLLABORATION MEMBERSHIPS & ROLES) TABLE
-- ============================================================================
create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id text not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_space_member unique (space_id, user_id)
);

create index if not exists idx_space_members_user_id on public.space_members(user_id);
create index if not exists idx_space_members_space_id on public.space_members(space_id);

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

drop trigger if exists trg_space_members_updated_at on public.space_members;
create trigger trg_space_members_updated_at
before update on public.space_members
for each row execute function public.set_updated_at();

-- Automatic trigger: Record creator as owner in space_members
create or replace function public.handle_new_space_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.user_id is not null then
    insert into public.space_members (space_id, user_id, role)
    values (new.id, new.user_id, 'owner')
    on conflict (space_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_spaces_after_insert_owner on public.spaces;
create trigger trg_spaces_after_insert_owner
  after insert on public.spaces
  for each row execute function public.handle_new_space_owner();

-- ============================================================================
-- 6. RPC FUNCTIONS FOR SECURE COLLABORATION (SECURITY DEFINER)
-- ============================================================================

-- A. Preview Space By Invite Code (Safe preview before joining)
create or replace function public.preview_space_by_invite(p_invite_code text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_space public.spaces%rowtype;
  v_owner_name text;
begin
  if p_invite_code is null or trim(p_invite_code) = '' then
    raise exception 'Kode undangan tidak boleh kosong';
  end if;

  select * into v_space
  from public.spaces
  where (upper(trim(invite_code)) = upper(trim(p_invite_code)) or id = trim(p_invite_code))
    and is_shared = true
  limit 1;

  if v_space.id is null then
    raise exception 'Notebook tidak ditemukan atau izin berbagi belum aktif';
  end if;

  select display_name into v_owner_name
  from public.profiles
  where id = v_space.user_id;

  return jsonb_build_object(
    'space', row_to_json(v_space),
    'owner_name', coalesce(v_owner_name, 'Pemilik Notebook')
  );
end;
$$;

-- B. Join Space By Invite Code
create or replace function public.join_space_by_invite(p_invite_code text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_space public.spaces%rowtype;
  v_role text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Anda harus masuk akun terlebih dahulu';
  end if;

  if p_invite_code is null or trim(p_invite_code) = '' then
    raise exception 'Kode undangan tidak boleh kosong';
  end if;

  select * into v_space
  from public.spaces
  where (upper(trim(invite_code)) = upper(trim(p_invite_code)) or id = trim(p_invite_code))
    and is_shared = true
  limit 1;

  if v_space.id is null then
    raise exception 'Notebook tidak ditemukan atau izin berbagi belum aktif';
  end if;

  if v_space.user_id = v_user_id then
    v_role := 'owner';
  else
    v_role := coalesce(v_space.default_role, 'editor');
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (v_space.id, v_user_id, v_role)
  on conflict (space_id, user_id)
  do update set role = excluded.role, updated_at = now();

  update public.spaces
  set members_count = (
    select count(*) from public.space_members where space_id = v_space.id
  )
  where id = v_space.id;

  select * into v_space from public.spaces where id = v_space.id;

  return jsonb_build_object(
    'space', row_to_json(v_space),
    'role', v_role
  );
end;
$$;

-- B. Leave Space
create or replace function public.leave_space(p_space_id text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_owner boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select exists (
    select 1 from public.spaces where id = p_space_id and user_id = v_user_id
  ) into v_is_owner;

  if v_is_owner then
    raise exception 'Pemilik tidak dapat meninggalkan notebook miliknya';
  end if;

  delete from public.space_members
  where space_id = p_space_id and user_id = v_user_id;

  update public.spaces
  set members_count = (
    select count(*) from public.space_members where space_id = p_space_id
  )
  where id = p_space_id;

  return true;
end;
$$;

-- C. Revoke Space Member
create or replace function public.revoke_space_member(p_space_id text, p_target_user_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (select 1 from public.spaces where id = p_space_id and user_id = v_user_id) then
    raise exception 'Hanya pemilik yang dapat mencabut akses anggota';
  end if;

  delete from public.space_members
  where space_id = p_space_id and user_id = p_target_user_id and role != 'owner';

  update public.spaces
  set members_count = (
    select count(*) from public.space_members where space_id = p_space_id
  )
  where id = p_space_id;

  return true;
end;
$$;

-- D. Get Space Members with Profile Info
create or replace function public.get_space_members(p_space_id text)
returns table (
  id uuid,
  space_id text,
  user_id uuid,
  role text,
  created_at timestamptz,
  display_name text,
  avatar_url text
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.space_members sm where sm.space_id = p_space_id and sm.user_id = auth.uid()
  ) and not exists (
    select 1 from public.spaces s where s.id = p_space_id and s.user_id = auth.uid()
  ) then
    raise exception 'Akses ditolak';
  end if;

  return query
  select
    sm.id,
    sm.space_id,
    sm.user_id,
    sm.role,
    sm.created_at,
    p.display_name,
    p.avatar_url
  from public.space_members sm
  left join public.profiles p on p.id = sm.user_id
  where sm.space_id = p_space_id
  order by (case when sm.role = 'owner' then 0 when sm.role = 'editor' then 1 else 2 end), sm.created_at asc;
end;
$$;

-- ============================================================================
-- 7. ZERO-LEAK ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.field_notes enable row level security;

-- Spaces Policies (Zero-leak: only owner or verified space_members)
drop policy if exists "Users can view their own spaces" on public.spaces;
drop policy if exists "Users can view accessible spaces" on public.spaces;
create policy "Users can view accessible spaces"
  on public.spaces for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = spaces.id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert their own spaces" on public.spaces;
create policy "Users can insert their own spaces"
  on public.spaces for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own spaces" on public.spaces;
create policy "Users can update their own spaces"
  on public.spaces for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own spaces" on public.spaces;
create policy "Users can delete their own spaces"
  on public.spaces for delete
  using (auth.uid() = user_id);

-- Space Members Policies
drop policy if exists "Members and owners can view memberships" on public.space_members;
create policy "Members and owners can view memberships"
  on public.space_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.spaces s
      where s.id = space_members.space_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can modify memberships" on public.space_members;
create policy "Owners can modify memberships"
  on public.space_members for all
  using (
    exists (
      select 1 from public.spaces s
      where s.id = space_members.space_id and s.user_id = auth.uid()
    )
  );

-- Field Notes Policies (Zero-leak: only owner or verified editor/viewer)
drop policy if exists "Users can view notes in accessible spaces" on public.field_notes;
create policy "Users can view notes in accessible spaces"
  on public.field_notes for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.spaces s
      where s.id = field_notes.space_id and s.user_id = auth.uid()
    )
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = field_notes.space_id and sm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert notes in accessible spaces" on public.field_notes;
create policy "Users can insert notes in accessible spaces"
  on public.field_notes for insert
  with check (
    exists (
      select 1 from public.spaces s
      where s.id = field_notes.space_id and s.user_id = auth.uid()
    )
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = field_notes.space_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'editor')
    )
  );

drop policy if exists "Users can update notes in accessible spaces" on public.field_notes;
create policy "Users can update notes in accessible spaces"
  on public.field_notes for update
  using (
    (
      auth.uid() = user_id
      and exists (
        select 1 from public.space_members sm
        where sm.space_id = field_notes.space_id
          and sm.user_id = auth.uid()
          and sm.role in ('owner', 'editor')
      )
    )
    or exists (
      select 1 from public.spaces s
      where s.id = field_notes.space_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete notes in accessible spaces" on public.field_notes;
create policy "Users can delete notes in accessible spaces"
  on public.field_notes for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.spaces s
      where s.id = field_notes.space_id and s.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. STORAGE BUCKET FOR MEDIA & AVATARS ('noticed-media')
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'noticed-media',
  'noticed-media',
  true,
  26214400, -- 25 MB max per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/webm', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/mpeg', 'audio/ogg', 'audio/wav'
  ]
)
on conflict (id) do update set
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

drop policy if exists "Noticed Media Public Read" on storage.objects;
drop policy if exists "Noticed Media Authenticated Upload" on storage.objects;
drop policy if exists "Noticed Media Authenticated Update" on storage.objects;
drop policy if exists "Noticed Media Authenticated Delete" on storage.objects;

create policy "Noticed Media Public Read"
  on storage.objects for select
  using (bucket_id = 'noticed-media');

create policy "Noticed Media Authenticated Upload"
  on storage.objects for insert
  with check (
    bucket_id = 'noticed-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

create policy "Noticed Media Authenticated Update"
  on storage.objects for update
  using (
    bucket_id = 'noticed-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

create policy "Noticed Media Authenticated Delete"
  on storage.objects for delete
  using (
    bucket_id = 'noticed-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

-- ============================================================================
-- 8. SUPABASE REALTIME (WEBSOCKET LIVE CHANGES)
-- Enables PostgreSQL replication to WebSockets for live collaborative updates
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'field_notes'
    ) then
      alter publication supabase_realtime add table public.field_notes;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'spaces'
    ) then
      alter publication supabase_realtime add table public.spaces;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'space_members'
    ) then
      alter publication supabase_realtime add table public.space_members;
    end if;
  end if;
end;
$$;
