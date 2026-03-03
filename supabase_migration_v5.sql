-- ==========================================
-- カドスケ！ マイグレーション v5
-- マスターデータテーブル + 大会テーブル拡張
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- ========================================
-- 1. game_masters テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS game_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#888888',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_masters_active ON game_masters(is_active, sort_order);

ALTER TABLE game_masters ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーを削除してから再作成
DROP POLICY IF EXISTS "Anyone can read active games" ON game_masters;
CREATE POLICY "Anyone can read active games"
  ON game_masters FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage games" ON game_masters;
CREATE POLICY "Admins can manage games"
  ON game_masters FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- シードデータ: 15ゲーム
INSERT INTO game_masters (name, color, sort_order) VALUES
  ('ポケモンカードゲーム', '#E8341C', 1),
  ('ONE PIECEカードゲーム', '#D42B1E', 2),
  ('デュエル・マスターズ', '#1E90FF', 3),
  ('Pokémon Trading Card Game Pocket', '#FFB800', 4),
  ('遊戯王マスターデュエル', '#6B4C9A', 5),
  ('神託のメソロギア', '#2E8B57', 6),
  ('遊戯王OCG', '#7B2D8E', 7),
  ('蟲神器', '#4A7028', 8),
  ('ウルトラマン カードゲーム', '#C41E3A', 9),
  ('デジモンカードゲーム', '#0077C8', 10),
  ('ユニオンアリーナ', '#E65100', 11),
  ('DUEL MASTERS PLAY''S', '#1565C0', 12),
  ('ホロライブ カードゲーム', '#33CCFF', 13),
  ('ShadowverseEVOLVE', '#4A90D9', 14),
  ('Shadowverse:Worlds beyond', '#3A7BD5', 15)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 2. tag_masters テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS tag_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_masters_active ON tag_masters(is_active, sort_order);

ALTER TABLE tag_masters ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーを削除してから再作成
DROP POLICY IF EXISTS "Anyone can read active tags" ON tag_masters;
CREATE POLICY "Anyone can read active tags"
  ON tag_masters FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage tags" ON tag_masters;
CREATE POLICY "Admins can manage tags"
  ON tag_masters FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- シードデータ: ハッシュタグ
INSERT INTO tag_masters (label, category, sort_order) VALUES
  ('初心者歓迎', 'general', 1),
  ('賞金つき', 'reward', 2),
  ('景品つき', 'reward', 3),
  ('配信あり', 'general', 4)
ON CONFLICT (label) DO NOTHING;

-- ========================================
-- 3. tournaments テーブル拡張
-- ========================================

-- 参加費タイプ（無料/有料）
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee_type text DEFAULT 'free';

-- 参加費金額（有料の場合のみ）
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee_amount integer;

-- 開催形式（オンライン/オフライン）
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'offline';

-- 都道府県（オフラインの場合のみ）
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prefecture text;

-- CHECK制約を安全に追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_entry_fee_type_check'
  ) THEN
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_entry_fee_type_check
      CHECK (entry_fee_type IN ('free', 'paid'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_location_type_check'
  ) THEN
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_location_type_check
      CHECK (location_type IN ('online', 'offline'));
  END IF;
END $$;

SELECT 'Migration v5 completed! マスターデータテーブル作成 + 大会テーブル拡張完了' AS result;
