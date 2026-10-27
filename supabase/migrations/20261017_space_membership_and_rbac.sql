-- ============================================================================
-- MIGRATION: SPACE MEMBERSHIP, SECURE JOIN RPC, AND ZERO-LEAK RLS HARDENING
-- Date: 2026-10-17
-- ============================================================================

-- 1. Add default_role to public.spaces
alter table public.spaces
  add column if not exists default_role text not null default 'editor' check (default_role in ('editor', 'viewer'));

-- 2. Create public.space_members table
create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id text not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_space_member unique (space_id, user_id)
);

-- Performance indexes for membership lookups
create index if not exists idx_space_members_user_id on public.space_members(user_id);
create index if not exists idx_space_members_space_id on public.space_members(space_id);

-- updated_at trigger for space_members
drop trigger if exists trg_space_members_updated_at on public.space_members;
create trigger trg_space_members_updated_at
  before update on public.space_members
  for each row execute function public.set_updated_at();

-- 3. Automatic trigger: Ensure space creator is recorded as owner in space_members
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

-- 4. Backfill existing spaces to space_members
insert into public.space_members (space_id, user_id, role)
select id, user_id, 'owner'
from public.spaces
where user_id is not null
on conflict (space_id, user_id) do nothing;

-- 4.2 Non-recursive SECURITY DEFINER helpers for RLS
create or replace function public.is_space_owner(p_space_id text, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.spaces
    where id = p_space_id and user_id = p_user_id
  );
$$;

create or replace function public.is_space_member(p_space_id text, p_user_id uuid, p_roles text[] default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.space_members
    where space_id = p_space_id
      and user_id = p_user_id
      and (p_roles is null or role = any(p_roles))
  );
$$;

-- 4.5 RPC: preview_space_by_invite (SECURITY DEFINER)
-- Safe preview lookup for non-members before joining
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

-- 5. RPC: join_space_by_invite (SECURITY DEFINER)
-- Validates code and assigns membership safely without exposing broad table scan
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

  -- Look up space by invite code (case-insensitive) or exact space id
  select * into v_space
  from public.spaces
  where (upper(trim(invite_code)) = upper(trim(p_invite_code)) or id = trim(p_invite_code))
    and is_shared = true
  limit 1;

  if v_space.id is null then
    raise exception 'Notebook tidak ditemukan atau izin berbagi belum aktif';
  end if;

  -- If user is owner, keep owner role; otherwise assign default_role
  if v_space.user_id = v_user_id then
    v_role := 'owner';
  else
    v_role := coalesce(v_space.default_role, 'editor');
  end if;

  -- Record membership
  insert into public.space_members (space_id, user_id, role)
  values (v_space.id, v_user_id, v_role)
  on conflict (space_id, user_id)
  do update set role = excluded.role, updated_at = now();

  -- Synchronize members_count
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

-- 6. RPC: leave_space
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

-- 7. RPC: revoke_space_member (Owner kicks collaborator)
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

-- 8. RPC: get_space_members
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

-- 9. ZERO-LEAK RLS HARDENING (Strictly TO authenticated)

-- A. Profiles
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- B. Spaces
alter table public.spaces enable row level security;

drop policy if exists "Users can view their own spaces" on public.spaces;
drop policy if exists "Users can view accessible spaces" on public.spaces;
create policy "Users can view accessible spaces"
  on public.spaces for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_space_member(id, auth.uid(), null)
  );

drop policy if exists "Users can insert their own spaces" on public.spaces;
create policy "Users can insert their own spaces"
  on public.spaces for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own spaces" on public.spaces;
create policy "Users can update their own spaces"
  on public.spaces for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own spaces" on public.spaces;
create policy "Users can delete their own spaces"
  on public.spaces for delete
  to authenticated
  using (auth.uid() = user_id);

-- C. Space Members
alter table public.space_members enable row level security;

drop policy if exists "Members and owners can view memberships" on public.space_members;
create policy "Members and owners can view memberships"
  on public.space_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_space_owner(space_id, auth.uid())
    or public.is_space_member(space_id, auth.uid(), null)
  );

drop policy if exists "Owners can modify memberships" on public.space_members;
create policy "Owners can modify memberships"
  on public.space_members for all
  to authenticated
  using (public.is_space_owner(space_id, auth.uid()))
  with check (public.is_space_owner(space_id, auth.uid()));

-- D. Field Notes
alter table public.field_notes enable row level security;

drop policy if exists "Users can view notes in accessible spaces" on public.field_notes;
create policy "Users can view notes in accessible spaces"
  on public.field_notes for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_space_owner(space_id, auth.uid())
    or public.is_space_member(space_id, auth.uid(), null)
  );

drop policy if exists "Users can insert notes in accessible spaces" on public.field_notes;
create policy "Users can insert notes in accessible spaces"
  on public.field_notes for insert
  to authenticated
  with check (
    public.is_space_owner(space_id, auth.uid())
    or public.is_space_member(space_id, auth.uid(), array['owner', 'editor'])
  );

drop policy if exists "Users can update notes in accessible spaces" on public.field_notes;
create policy "Users can update notes in accessible spaces"
  on public.field_notes for update
  to authenticated
  using (
    public.is_space_owner(space_id, auth.uid())
    or (
      auth.uid() = user_id
      and public.is_space_member(space_id, auth.uid(), array['owner', 'editor'])
    )
  );

drop policy if exists "Users can delete notes in accessible spaces" on public.field_notes;
create policy "Users can delete notes in accessible spaces"
  on public.field_notes for delete
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_space_owner(space_id, auth.uid())
  );

-- 10. Enable Supabase Realtime for space_members
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'space_members'
    ) then
      alter publication supabase_realtime add table public.space_members;
    end if;
  end if;
end;
$$;
