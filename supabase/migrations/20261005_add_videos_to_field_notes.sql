-- ==============================================================================
-- Migration: Add videos JSONB column to field_notes table
-- Description: Supports array of video URLs/attachments for Noticed
-- Idempotent: Safe to execute multiple times
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'field_notes'
  ) THEN
    ALTER TABLE public.field_notes 
    ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
