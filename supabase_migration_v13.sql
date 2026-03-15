-- ==========================================
-- カドスケ！ マイグレーション v13
-- 友人招待コードシステム
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- 招待コード関連カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);

-- 紹介報酬テーブル
CREATE TABLE IF NOT EXISTS referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  new_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_points integer NOT NULL DEFAULT 100,
  new_user_points integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, new_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer
  ON referral_rewards(referrer_id);

-- RLSポリシー
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own referral rewards" ON referral_rewards;
CREATE POLICY "Users can read own referral rewards" ON referral_rewards
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = new_user_id);

DROP POLICY IF EXISTS "Users can insert referral rewards" ON referral_rewards;
CREATE POLICY "Users can insert referral rewards" ON referral_rewards
  FOR INSERT WITH CHECK (auth.uid() = new_user_id);

SELECT 'Migration v13 completed! 招待コードシステム作成完了' AS result;
