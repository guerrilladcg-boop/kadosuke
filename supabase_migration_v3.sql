-- ==========================================
-- カドスケ！ マイグレーション v3
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- 1. profiles に INSERT ポリシー追加（アプリ側でプロフィール作成を可能にする）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- 2. サインアップ時に自動で profiles レコードを作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, push_notifications_enabled, is_public, is_premium)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(split_part(NEW.email, '@', 1), 'プレイヤー'),
    true,
    true,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーがあれば削除してから再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. 既存ユーザーで profiles がないユーザーのレコードを作成
INSERT INTO public.profiles (id, email, name, push_notifications_enabled, is_public, is_premium)
SELECT
  au.id,
  au.email,
  COALESCE(split_part(au.email, '@', 1), 'プレイヤー'),
  true,
  true,
  false
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 4. 戦績テーブル（ユーザーごと・大会ごとの個別戦績）
CREATE TABLE IF NOT EXISTS tournament_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ranking integer,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  deck_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tr_user ON tournament_results(user_id);
CREATE INDEX IF NOT EXISTS idx_tr_tournament ON tournament_results(tournament_id);

ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results" ON tournament_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results" ON tournament_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own results" ON tournament_results
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own results" ON tournament_results
  FOR DELETE USING (auth.uid() = user_id);
-- 主催者は大会結果を閲覧できる
CREATE POLICY "Organizers can view tournament results" ON tournament_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_results.tournament_id
      AND t.created_by = auth.uid()
    )
  );

SELECT 'Migration v3 completed!' AS result;
