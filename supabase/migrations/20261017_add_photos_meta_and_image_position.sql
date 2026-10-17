-- ============================================================================
-- MIGRATION: ADD PHOTOS_META, IMAGE_POSITION, AND ARCHIVED COLUMNS TO FIELD_NOTES
-- Date: 2026-10-17
-- ============================================================================

-- 1. Ensure field_notes has photos_meta, image_position, and archived columns
alter table public.field_notes
  add column if not exists photos_meta jsonb default '[]'::jsonb,
  add column if not exists image_position text default 'bottom',
  add column if not exists archived boolean not null default false;

-- 2. Performance indexes for archived field_notes queries
create index if not exists idx_field_notes_archived 
  on public.field_notes(space_id, archived) 
  where archived = true;

-- 3. Notify PostgREST schema cache to reload
notify pgrst, 'reload schema';
