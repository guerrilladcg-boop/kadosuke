-- ==========================================
-- カドスケ！ マイグレーション v10
-- デイリーログインボーナス
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS daily_login_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claimed_date date NOT NULL DEFAULT CURRENT_DATE,
  bonus_points integer NOT NULL DEFAULT 10,
  total_days integer NOT NULL DEFAULT 1,
  is_milestone boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, claimed_date)
);

CREATE INDEX IF NOT EXISTS idx_login_bonus_user_date
  ON daily_login_bonuses(user_id, claimed_date DESC);

-- RLSポリシー
ALTER TABLE daily_login_bonuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own bonuses" ON daily_login_bonuses;
CREATE POLICY "Users can read own bonuses" ON daily_login_bonuses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bonuses" ON daily_login_bonuses;
CREATE POLICY "Users can insert own bonuses" ON daily_login_bonuses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

SELECT 'Migration v10 completed! daily_login_bonuses テーブル作成完了' AS result;
