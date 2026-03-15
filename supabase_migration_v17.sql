-- ==========================================
-- カドスケ！ マイグレーション v17
-- 主催者機能拡張: リーグ・テンプレート・スポンサー募集
-- ＋ entries/favorites テーブル作成（未作成の場合）
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- ====== entries テーブル（大会参加登録） ======
CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_entries_tournament ON entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read entries" ON entries;
CREATE POLICY "Users can read entries" ON entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own entries" ON entries;
CREATE POLICY "Users can insert own entries" ON entries FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON entries;
CREATE POLICY "Users can delete own entries" ON entries FOR DELETE USING (auth.uid() = user_id);

-- ====== favorites テーブル（お気に入り） ======
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_tournament ON favorites(tournament_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read favorites" ON favorites;
CREATE POLICY "Users can read favorites" ON favorites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ====== tournament_results テーブル拡張（CSV インポート対応） ======
-- player_name カラム追加（CSVインポート時に使用、ユーザー紐付けなし）
ALTER TABLE tournament_results ADD COLUMN IF NOT EXISTS player_name text;
-- points カラム追加（CSV用。既存の points_earned とは別）
ALTER TABLE tournament_results ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
-- user_id を NULL 許可に変更（CSVインポート時は user_id なし）
ALTER TABLE tournament_results ALTER COLUMN user_id DROP NOT NULL;
-- UNIQUE制約は既存のまま（tournament_id, user_id）

-- ====== リーグ/シーズン ======

CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  game text NOT NULL,
  game_color text,
  season_name text,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leagues_created_by ON leagues(created_by);
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own leagues" ON leagues FOR ALL USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS league_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  name text,
  date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, round_number)
);
CREATE INDEX IF NOT EXISTS idx_league_rounds_league ON league_rounds(league_id);
ALTER TABLE league_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own league rounds" ON league_rounds FOR ALL USING (
  EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_rounds.league_id AND leagues.created_by = auth.uid())
);

CREATE TABLE IF NOT EXISTS league_round_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES league_rounds(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  deck_name text,
  ranking integer,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_league_round_results_round ON league_round_results(round_id);
ALTER TABLE league_round_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own round results" ON league_round_results FOR ALL USING (
  EXISTS (
    SELECT 1 FROM league_rounds lr
    JOIN leagues l ON l.id = lr.league_id
    WHERE lr.id = league_round_results.round_id AND l.created_by = auth.uid()
  )
);

CREATE TABLE IF NOT EXISTS league_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  deck_name text,
  total_wins integer NOT NULL DEFAULT 0,
  total_losses integer NOT NULL DEFAULT 0,
  total_draws integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  rank integer,
  rounds_played integer NOT NULL DEFAULT 0,
  UNIQUE(league_id, player_name)
);
CREATE INDEX IF NOT EXISTS idx_league_standings_league ON league_standings(league_id);
ALTER TABLE league_standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own standings" ON league_standings FOR ALL USING (
  EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_standings.league_id AND leagues.created_by = auth.uid())
);
-- 全ユーザーがスタンディングを閲覧可能
CREATE POLICY "Anyone can view standings" ON league_standings FOR SELECT USING (true);

-- ====== テンプレート ======

CREATE TABLE IF NOT EXISTS tournament_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  game text,
  game_color text,
  organizer text,
  location text,
  max_players integer,
  description text,
  tags text[],
  entry_fee_type text DEFAULT 'free',
  entry_fee_amount integer,
  location_type text DEFAULT 'offline',
  prefecture text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON tournament_templates(created_by);
ALTER TABLE tournament_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates" ON tournament_templates FOR ALL USING (auth.uid() = created_by);

-- ====== スポンサー募集 ======

CREATE TABLE IF NOT EXISTS sponsor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  desired_items text,
  desired_budget integer,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_created_by ON sponsor_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_status ON sponsor_requests(status);
ALTER TABLE sponsor_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own requests" ON sponsor_requests FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Anyone can view open requests" ON sponsor_requests FOR SELECT USING (status = 'open');

CREATE TABLE IF NOT EXISTS sponsor_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES sponsor_requests(id) ON DELETE CASCADE,
  sponsor_name text NOT NULL,
  sponsor_contact text,
  offer_description text,
  offer_amount integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sponsor_offers_request ON sponsor_offers(request_id);
ALTER TABLE sponsor_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Request owners manage offers" ON sponsor_offers FOR ALL USING (
  EXISTS (SELECT 1 FROM sponsor_requests WHERE sponsor_requests.id = sponsor_offers.request_id AND sponsor_requests.created_by = auth.uid())
);
-- Anyone can insert an offer
CREATE POLICY "Anyone can submit offers" ON sponsor_offers FOR INSERT WITH CHECK (true);

-- ====== 主催者が自分の大会のエントリーを閲覧可能 ======
DROP POLICY IF EXISTS "Organizers can view tournament entries" ON entries;
CREATE POLICY "Organizers can view tournament entries" ON entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tournaments WHERE tournaments.id = entries.tournament_id AND tournaments.created_by = auth.uid())
  );

-- 主催者が自分の大会の結果を閲覧可能
DROP POLICY IF EXISTS "Organizers can view tournament results" ON tournament_results;
CREATE POLICY "Organizers can view tournament results" ON tournament_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tournaments WHERE tournaments.id = tournament_results.tournament_id AND tournaments.created_by = auth.uid())
  );

-- 主催者が自分の大会の結果をINSERT可能（CSV一括インポート用）
DROP POLICY IF EXISTS "Organizers can insert tournament results" ON tournament_results;
CREATE POLICY "Organizers can insert tournament results" ON tournament_results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments WHERE tournaments.id = tournament_results.tournament_id AND tournaments.created_by = auth.uid())
  );

-- 主催者が自分の大会の結果をDELETE可能（CSV再インポート時の既存データ削除用）
DROP POLICY IF EXISTS "Organizers can delete tournament results" ON tournament_results;
CREATE POLICY "Organizers can delete tournament results" ON tournament_results
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM tournaments WHERE tournaments.id = tournament_results.tournament_id AND tournaments.created_by = auth.uid())
  );

SELECT 'Migration v17 completed! entries/favorites作成 + 主催者機能拡張テーブル作成完了' AS result;
