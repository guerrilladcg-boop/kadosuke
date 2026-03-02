-- ============================================
-- カドスケ！ Supabase マイグレーション
-- ============================================

-- 1. profiles テーブルにカラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organizer_status text NOT NULL DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_names jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_display_name_index integer NOT NULL DEFAULT 0;

-- organizer_status の CHECK 制約
ALTER TABLE profiles ADD CONSTRAINT chk_organizer_status
  CHECK (organizer_status IN ('none', 'pending', 'approved', 'rejected'));

-- 既存データの移行（is_organizer = true → organizer_status = 'approved'）
UPDATE profiles SET organizer_status = 'approved' WHERE is_organizer = true;

-- 2. organizer_applications テーブル
CREATE TABLE IF NOT EXISTS organizer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  reason text
);

CREATE INDEX IF NOT EXISTS idx_org_app_status ON organizer_applications(status);
CREATE INDEX IF NOT EXISTS idx_org_app_user ON organizer_applications(user_id);

-- RLS for organizer_applications
ALTER TABLE organizer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own applications"
  ON organizer_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own application"
  ON organizer_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can read all applications"
  ON organizer_applications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update applications"
  ON organizer_applications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. ad_views テーブル
CREATE TABLE IF NOT EXISTS ad_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  points_earned integer NOT NULL DEFAULT 50
);

CREATE INDEX IF NOT EXISTS idx_ad_views_user_date ON ad_views(user_id, viewed_at);

-- RLS for ad_views
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ad views"
  ON ad_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad view"
  ON ad_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Supabase Storage: avatars バケット
-- Dashboard から手動で作成してください:
--   1. Storage > New Bucket > Name: "avatars"
--   2. Public bucket: ON
--   3. File size limit: 2MB
--   4. Allowed MIME types: image/jpeg, image/png, image/webp
-- ============================================
