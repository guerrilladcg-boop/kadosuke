-- ==========================================
-- カドスケ！ マイグレーション v22
-- リーグ勝ち点設定 & 参加者向け閲覧
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- ====== leagues テーブルに勝ち点設定カラム追加 ======
-- point_rule_type: 'wld' (勝ち/負け/分け) or 'ranking' (順位ベース)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS point_rule_type text NOT NULL DEFAULT 'wld'
  CHECK (point_rule_type IN ('wld', 'ranking'));

-- WLD方式: 勝ち/負け/分けそれぞれのポイント
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS point_win integer NOT NULL DEFAULT 3;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS point_loss integer NOT NULL DEFAULT 0;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS point_draw integer NOT NULL DEFAULT 1;

-- ランキング方式: 順位ごとのポイント (JSON配列 e.g. [10,5,3,1])
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS point_ranking jsonb;

-- リーグを公開可能にする（参加者が閲覧できるよう）
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- ====== 全ユーザーがリーグ情報を閲覧可能 ======
-- 既存ポリシーは owner のみだったので、公開リーグの SELECT を追加
DROP POLICY IF EXISTS "Anyone can view public leagues" ON leagues;
CREATE POLICY "Anyone can view public leagues" ON leagues
  FOR SELECT USING (is_public = true);

-- ====== league_rounds も閲覧可能に ======
DROP POLICY IF EXISTS "Anyone can view rounds of public leagues" ON league_rounds;
CREATE POLICY "Anyone can view rounds of public leagues" ON league_rounds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_rounds.league_id AND leagues.is_public = true)
  );

-- ====== league_round_results も閲覧可能に ======
DROP POLICY IF EXISTS "Anyone can view results of public leagues" ON league_round_results;
CREATE POLICY "Anyone can view results of public leagues" ON league_round_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM league_rounds lr
      JOIN leagues l ON l.id = lr.league_id
      WHERE lr.id = league_round_results.round_id AND l.is_public = true
    )
  );

-- ====== league_standings に user_id カラム追加（プレイヤー名とユーザーの紐付け） ======
ALTER TABLE league_standings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_league_standings_user ON league_standings(user_id);

-- ====== league_participants テーブル（リーグ参加者登録） ======
CREATE TABLE IF NOT EXISTS league_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_league_participants_league ON league_participants(league_id);
CREATE INDEX IF NOT EXISTS idx_league_participants_user ON league_participants(user_id);

ALTER TABLE league_participants ENABLE ROW LEVEL SECURITY;

-- 公開リーグの参加者は誰でも閲覧可能
DROP POLICY IF EXISTS "Anyone can view participants of public leagues" ON league_participants;
CREATE POLICY "Anyone can view participants of public leagues" ON league_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_participants.league_id AND leagues.is_public = true)
  );

-- リーグオーナーが管理
DROP POLICY IF EXISTS "League owners manage participants" ON league_participants;
CREATE POLICY "League owners manage participants" ON league_participants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_participants.league_id AND leagues.created_by = auth.uid())
  );

-- ユーザー自身が参加/辞退
DROP POLICY IF EXISTS "Users can join leagues" ON league_participants;
CREATE POLICY "Users can join leagues" ON league_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave leagues" ON league_participants;
CREATE POLICY "Users can leave leagues" ON league_participants
  FOR DELETE USING (auth.uid() = user_id);

SELECT 'Migration v22 completed! リーグ勝ち点設定 + 参加者閲覧機能追加完了' AS result;
