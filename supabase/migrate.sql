-- ============================================================
-- Migration: Admin system management tables
-- Run this ONCE in Supabase → SQL Editor on existing deployments
-- ============================================================

-- ── Email blacklist ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_blacklist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  added_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_blacklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blacklist_select" ON public.email_blacklist;
DROP POLICY IF EXISTS "blacklist_all"    ON public.email_blacklist;
CREATE POLICY "blacklist_select" ON public.email_blacklist FOR SELECT USING (true);
CREATE POLICY "blacklist_all"    ON public.email_blacklist FOR ALL    USING (true);

-- ── System settings (key-value) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "settings_all"    ON public.system_settings;
CREATE POLICY "settings_select" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "settings_all"    ON public.system_settings FOR ALL    USING (true);

-- Default: new recommendations are enabled
INSERT INTO public.system_settings (key, value)
VALUES ('recommendations_enabled', 'true')
ON CONFLICT DO NOTHING;

-- ── Shopping cart (per user) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carts (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items      JSONB       NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cart_owner" ON public.carts;
CREATE POLICY "cart_owner" ON public.carts FOR ALL USING (auth.uid() = user_id);

-- ── Grant admin flag to pre-configured admin accounts ────────
-- Runs safely even if accounts don't exist yet (no-op in that case)
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@svcollege.co.il', 'hagai@svcollege.co.il')
);
