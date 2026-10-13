-- ============================================================================
-- ACCOUNT DELETION RPC
-- Required for Apple App Store (Guideline 5.1.1(v)) and Google Play Data Safety
-- Allows an authenticated user to permanently delete their account & all data.
-- ============================================================================

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Explicitly clean up all user-owned records (notes, spaces, profiles)
  delete from public.field_notes where user_id = v_user_id;
  delete from public.spaces where user_id = v_user_id;
  delete from public.profiles where id = v_user_id;

  -- 2. Delete user identity from auth.users (cascades sessions & tokens)
  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
