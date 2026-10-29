-- ============================================================================
-- Migration: Harden Collaboration RPC Permissions & Profile Security
-- Ensures all SECURITY DEFINER RPCs are restricted to authenticated users only.
-- ============================================================================

REVOKE ALL ON FUNCTION public.preview_space_by_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_space_by_invite(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.join_space_by_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_space_by_invite(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.leave_space(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_space(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_space_member(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_space_member(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_space_members(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_space_members(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
