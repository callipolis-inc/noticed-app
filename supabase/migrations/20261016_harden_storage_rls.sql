-- ============================================================================
-- Noticed App: Harden Storage RLS Policies for 'noticed-media' Bucket
-- Ensures users can ONLY upload, update, and delete media files within their
-- own user-scoped directory: {folder}/{userId}/{filename}
-- Safe to run multiple times (Idempotent).
-- ============================================================================

-- 1. Drop existing permissive policies
drop policy if exists "Noticed Media Authenticated Upload" on storage.objects;
drop policy if exists "Noticed Media Authenticated Update" on storage.objects;
drop policy if exists "Noticed Media Authenticated Delete" on storage.objects;

-- 2. Hardened INSERT: user can only upload into their own folder (2nd segment)
create policy "Noticed Media Authenticated Upload"
  on storage.objects for insert
  with check (
    bucket_id = 'noticed-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

-- 3. Hardened UPDATE: user can only update their own files
create policy "Noticed Media Authenticated Update"
  on storage.objects for update
  using (
    bucket_id = 'noticed-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

-- 4. Hardened DELETE: user can only delete their own files
create policy "Noticed Media Authenticated Delete"
  on storage.objects for delete
  using (
    bucket_id = 'noticed-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );
