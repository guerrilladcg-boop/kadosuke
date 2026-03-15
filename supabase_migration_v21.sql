-- =====================================================
-- Migration v21: コア機能強化（外部URL、締切、公開プロフィール、レビュー）
-- =====================================================

-- === tournaments 拡張 ===
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_deadline timestamptz;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'upcoming';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS results_public boolean NOT NULL DEFAULT false;

-- === profiles 拡張 ===
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS main_deck text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievement_badges jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating numeric(2,1);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

-- === organizer_reviews 新規テーブル ===
CREATE TABLE IF NOT EXISTS organizer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_organizer ON organizer_reviews(organizer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tournament ON organizer_reviews(tournament_id);

ALTER TABLE organizer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON organizer_reviews
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON organizer_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON organizer_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Users can delete own reviews" ON organizer_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- === RLS: 公開プロフィールの戦績を誰でも閲覧可 ===
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'view_public_results' AND tablename = 'results'
  ) THEN
    CREATE POLICY "view_public_results" ON results
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = results.user_id AND profiles.is_public = true)
      );
  END IF;
END $$;

-- === RLS: 公開大会の結果を誰でも閲覧可 ===
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'view_public_tournament_results' AND tablename = 'tournament_results'
  ) THEN
    CREATE POLICY "view_public_tournament_results" ON tournament_results
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM tournaments WHERE tournaments.id = tournament_results.tournament_id AND tournaments.results_public = true)
      );
  END IF;
END $$;

-- === 評価平均を再計算するRPC関数 ===
CREATE OR REPLACE FUNCTION update_organizer_rating(org_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET
    avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM organizer_reviews WHERE organizer_id = org_id),
    review_count = (SELECT COUNT(*)::integer FROM organizer_reviews WHERE organizer_id = org_id)
  WHERE id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
