-- ==========================================
-- カドスケ！ マイグレーション v2
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- 1. profiles テーブルの RLS ポリシー追加（これが設定保存・主催者申請の根本原因）
-- まず既存ポリシーを確認して追加
DO $$
BEGIN
  -- SELECT ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id)';
  END IF;

  -- UPDATE ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id)';
  END IF;
END $$;

-- 2. organizer_applications に X アカウントと Tonamel URL カラムを追加
ALTER TABLE organizer_applications ADD COLUMN IF NOT EXISTS x_account text;
ALTER TABLE organizer_applications ADD COLUMN IF NOT EXISTS tonamel_url text;

-- 3. profiles にプレミアム（課金）関連カラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_type text CHECK (premium_type IN ('onetime', 'monthly'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;

-- 4. RLS が有効か確認（念のため）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;

-- 完了メッセージ
SELECT 'Migration v2 completed successfully!' AS result;
