-- ============================================================================
-- Noticed App: Dedicated Supabase Storage Bucket ('noticed-media')
-- Offloads heavy photos, 30s video clips & voice memos from PostgreSQL (500MB)
-- into Supabase Storage (1GB dedicated file storage).
-- Safe to run multiple times (Idempotent).
-- ============================================================================

-- 1. Create or update the 'noticed-media' bucket (publicly readable for fast inline rendering)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'noticed-media',
  'noticed-media',
  true,
  26214400, -- 25 MB max per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/x-m4a',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop existing policies if re-running so script stays 100% idempotent
DROP POLICY IF EXISTS "Noticed Media Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Noticed Media Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Noticed Media Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Noticed Media Authenticated Delete" ON storage.objects;

-- 3. Allow anyone to view/stream photos, inline videos & voice memos from 'noticed-media'
CREATE POLICY "Noticed Media Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'noticed-media');

-- 4. Allow uploads to 'noticed-media' (both signed-in users and offline-first guest sync)
CREATE POLICY "Noticed Media Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'noticed-media');

-- 5. Allow updates to 'noticed-media'
CREATE POLICY "Noticed Media Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'noticed-media');

-- 6. Allow deletes from 'noticed-media' (for auto-purging orphan files when notes are deleted)
CREATE POLICY "Noticed Media Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'noticed-media');
