-- ============================================================================
-- MIGRATION: HARDEN ACCOUNT DELETION RPC (APPLE GUIDELINE 5.1.1(v) & GDPR)
-- Date: 2026-10-17
-- ============================================================================

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer set search_path = public, auth, storage
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Purge all physical storage files belonging to user in 'noticed-media' bucket
  delete from storage.objects
  where bucket_id = 'noticed-media'
    and (storage.foldername(name))[2] = v_user_id::text;

  -- 2. Explicitly remove all space memberships for this user
  delete from public.space_members
  where user_id = v_user_id;

  -- 3. Explicitly clean up all user-owned notes, spaces (cascading child notes), and profiles
  delete from public.field_notes
  where user_id = v_user_id;

  delete from public.spaces
  where user_id = v_user_id;

  delete from public.profiles
  where id = v_user_id;

  -- 4. Delete user identity from auth.users (cascades sessions, refresh tokens)
  delete from auth.users
  where id = v_user_id;
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
