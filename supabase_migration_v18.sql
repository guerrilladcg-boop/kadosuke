-- ==========================================
-- カドスケ！ マイグレーション v18
-- 個人戦績テーブル (results) + 不足カラム補完
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- 1. 個人戦績テーブル（ユーザーが手動で登録する大会結果）
CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tournament_name text NOT NULL,
  game text NOT NULL,
  game_color text,
  date date NOT NULL,
  rank integer NOT NULL,
  total_players integer,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  deck_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_user
  ON results(user_id, date DESC);

-- RLSポリシー
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own results" ON results;
CREATE POLICY "Users can read own results" ON results
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own results" ON results;
CREATE POLICY "Users can insert own results" ON results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own results" ON results;
CREATE POLICY "Users can delete own results" ON results
  FOR DELETE USING (auth.uid() = user_id);

-- 2. profiles.points カラム（まだ無い場合のみ追加）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

SELECT 'Migration v18 completed! results テーブル + profiles.points 作成完了' AS result;
