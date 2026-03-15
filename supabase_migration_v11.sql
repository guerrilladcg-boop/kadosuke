-- ==========================================
-- カドスケ！ マイグレーション v11
-- フォロー主催者タイムライン
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS organizer_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organizer_id)
);

CREATE INDEX IF NOT EXISTS idx_organizer_follows_user
  ON organizer_follows(user_id);

-- RLSポリシー
ALTER TABLE organizer_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own follows" ON organizer_follows;
CREATE POLICY "Users can read own follows" ON organizer_follows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own follows" ON organizer_follows;
CREATE POLICY "Users can insert own follows" ON organizer_follows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON organizer_follows;
CREATE POLICY "Users can delete own follows" ON organizer_follows
  FOR DELETE USING (auth.uid() = user_id);

SELECT 'Migration v11 completed! organizer_follows テーブル作成完了' AS result;
