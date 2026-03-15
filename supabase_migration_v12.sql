-- ==========================================
-- カドスケ！ マイグレーション v12
-- 通算ミッション（隠し実績）
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  reward_points integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_missions_user
  ON user_missions(user_id);

-- RLSポリシー
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own missions" ON user_missions;
CREATE POLICY "Users can read own missions" ON user_missions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own missions" ON user_missions;
CREATE POLICY "Users can insert own missions" ON user_missions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own missions" ON user_missions;
CREATE POLICY "Users can update own missions" ON user_missions
  FOR UPDATE USING (auth.uid() = user_id);

SELECT 'Migration v12 completed! user_missions テーブル作成完了' AS result;
