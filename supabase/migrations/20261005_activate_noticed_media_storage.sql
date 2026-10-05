-- ============================================================================
-- Noticed App: Dedicated Supabase Storage Bucket ('noticed-media')
-- Offloads heavy photos, 30s video clips & voice memos from PostgreSQL (500MB)
-- into Supabase Storage (1GB dedicated file storage).
-- Safe to run multiple times (Idempotent).
-- ============================================================================

-- 1. Pastikan kolom videos tersedia di tabel field_notes
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'field_notes'
  ) THEN
    ALTER TABLE public.field_notes ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 2. Buat atau perbarui bucket 'noticed-media' (25 MB max per file, public read)
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

-- 3. Hapus policy lama agar idempoten jika dijalankan berulang kali
DROP POLICY IF EXISTS "Noticed Media Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Noticed Media Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Noticed Media Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Noticed Media Authenticated Delete" ON storage.objects;

-- 4. Izinkan siapa pun membaca/menampilkan file media secara publik (fast CDN streaming)
CREATE POLICY "Noticed Media Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'noticed-media');

-- 5. Izinkan pengguna terautentikasi dan guest upload ke bucket 'noticed-media'
CREATE POLICY "Noticed Media Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'noticed-media');

-- 6. Izinkan pengguna memperbarui file di bucket 'noticed-media'
CREATE POLICY "Noticed Media Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'noticed-media');

-- 7. Izinkan penghapusan file di bucket 'noticed-media' (untuk auto-purge file yatim saat catatan dihapus)
CREATE POLICY "Noticed Media Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'noticed-media');
