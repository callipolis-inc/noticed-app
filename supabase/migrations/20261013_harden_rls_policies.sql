-- ============================================================================
-- MIGRATION: 20261013_harden_rls_policies.sql
-- Restrict space updates to owners, and note updates/deletions to author or space owner.
-- Prevents unauthorized tampering or deletion in shared spaces.
-- ============================================================================

drop policy if exists "Users can update their own spaces" on public.spaces;
create policy "Users can update their own spaces"
  on public.spaces for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own spaces" on public.spaces;
create policy "Users can delete their own spaces"
  on public.spaces for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can update notes in accessible spaces" on public.field_notes;
create policy "Users can update notes in accessible spaces"
  on public.field_notes for update
  using (
    auth.uid() = user_id
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
