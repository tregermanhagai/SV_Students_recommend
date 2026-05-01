-- ============================================================
-- SV_Students_recommend — Supabase Database Setup
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ── 1. Profiles table (extends auth.users) ──────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  is_admin   BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Auto-create profile on new user signup ───────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Recommendations table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recommendations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  category         TEXT        NOT NULL
                               CHECK (category IN ('Book','Movie','Series','Activity','Other')),
  description      TEXT,
  image_url        TEXT,
  website_link     TEXT,
  recommender_name TEXT        NOT NULL,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── 4. Comments table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID        NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  commenter_name    TEXT        NOT NULL,
  commenter_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  rating            INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment_text      TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── 5. Row Level Security ────────────────────────────────────
-- (Backend uses service key which bypasses RLS, but enable for safety)

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments        ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/update their own profile
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- recommendations: public read, authenticated write, owner or admin can delete/update
DROP POLICY IF EXISTS "recs_select"  ON public.recommendations;
DROP POLICY IF EXISTS "recs_insert"  ON public.recommendations;
DROP POLICY IF EXISTS "recs_update"  ON public.recommendations;
DROP POLICY IF EXISTS "recs_delete"  ON public.recommendations;
CREATE POLICY "recs_select"  ON public.recommendations FOR SELECT USING (true);
CREATE POLICY "recs_insert"  ON public.recommendations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "recs_update"  ON public.recommendations FOR UPDATE USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)
);
CREATE POLICY "recs_delete"  ON public.recommendations FOR DELETE USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)
);

-- comments: public read, authenticated write, owner or admin can delete
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_update" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "comments_update" ON public.comments FOR UPDATE USING (auth.uid() = commenter_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (
  auth.uid() = commenter_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)
);

-- ── 6. Indexes for performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recs_created_at  ON public.recommendations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recs_category    ON public.recommendations (category);
CREATE INDEX IF NOT EXISTS idx_comments_rec_id  ON public.comments (recommendation_id);

-- ── 7. Grant admin by email (run AFTER the admin user registers) ────────────
-- UPDATE public.profiles
-- SET is_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'hagai@svcollege.co.il');

-- ── 8. Storage bucket ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('recommendation-images', 'recommendation-images', true)
ON CONFLICT (id) DO NOTHING;

-- ── 9. Email blacklist ───────────────────────────────────────
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

-- ── 10. System settings (key-value) ─────────────────────────
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

INSERT INTO public.system_settings (key, value)
VALUES ('recommendations_enabled', 'true')
ON CONFLICT DO NOTHING;
