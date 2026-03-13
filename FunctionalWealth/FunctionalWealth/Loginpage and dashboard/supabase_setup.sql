-- ============================================================
-- Supabase Migration: Users Table for AI Accessibility Hub
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Create the users table
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uid          TEXT        UNIQUE NOT NULL,       -- Firebase Auth UID
  email        TEXT,                              -- Google account email
  display_name TEXT,                              -- Full name from Google
  photo_url    TEXT,                              -- Profile photo URL
  created_at   TIMESTAMPTZ DEFAULT NOW(),         -- First sign-in time
  last_login   TIMESTAMPTZ DEFAULT NOW()          -- Updated on every visit
);

-- Index on uid for fast lookups (already unique, but explicit index helps)
CREATE INDEX IF NOT EXISTS users_uid_idx ON public.users (uid);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow the anon key to INSERT and UPSERT (needed for client-side JS)
CREATE POLICY "Allow upsert for all"
  ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- OPTIONAL: If you want stricter security, use this instead:
-- (Users can only read/write their own row, matched by uid)
-- ============================================================

-- DROP POLICY "Allow upsert for all" ON public.users;

-- CREATE POLICY "Users can upsert own row"
--   ON public.users
--   FOR ALL
--   USING (uid = current_setting('request.jwt.claims', true)::json->>'sub')
--   WITH CHECK (uid = current_setting('request.jwt.claims', true)::json->>'sub');
