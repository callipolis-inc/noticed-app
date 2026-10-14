-- Migration: Add foil_color column to spaces table
-- Date: 2026-10-14
-- Description: Stores custom luxury foil leaf color presets (Gold, Rose Gold, Platinum, Copper, Emerald, etc.) for notebook spines and covers

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS foil_color text;
