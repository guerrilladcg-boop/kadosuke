-- ==========================================
-- カドスケ！ マイグレーション v6
-- 協賛品DB管理 + 抽選システム
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- ========================================
-- 1. sponsor_items テーブル（協賛品マスター）
-- ========================================
CREATE TABLE IF NOT EXISTS sponsor_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🎁',
  point_cost integer NOT NULL CHECK (point_cost > 0),
  type text NOT NULL DEFAULT 'exchange' CHECK (type IN ('exchange', 'lottery')),
  sponsor_name text,
  is_active boolean NOT NULL DEFAULT true,
  stock integer,
  total_entries integer NOT NULL DEFAULT 0,
  total_points_invested integer NOT NULL DEFAULT 0,
  lottery_status text DEFAULT 'open' CHECK (lottery_status IN ('open', 'closed', 'drawn')),
  winner_user_id uuid REFERENCES profiles(id),
  drawn_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_items_active ON sponsor_items(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_sponsor_items_type ON sponsor_items(type, is_active);

ALTER TABLE sponsor_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active sponsor items" ON sponsor_items;
CREATE POLICY "Anyone can read active sponsor items"
  ON sponsor_items FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can read all sponsor items" ON sponsor_items;
CREATE POLICY "Admins can read all sponsor items"
  ON sponsor_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can manage sponsor items" ON sponsor_items;
CREATE POLICY "Admins can manage sponsor items"
  ON sponsor_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- シードデータ
INSERT INTO sponsor_items (name, description, icon, point_cost, type, sponsor_name, is_active, sort_order) VALUES
  ('限定スリーブ', '大会限定デザインのカードスリーブ', '🃏', 500, 'exchange', 'カドスケ運営', true, 1),
  ('ドリンクチケット', 'オフライン大会で使えるドリンク引換券', '🥤', 150, 'exchange', 'カドスケ運営', true, 2),
  ('「激選」最新BOX', '最新弾のBOXが当たる抽選！投票口数が多いほど当選確率UP！', '🎰', 100, 'lottery', 'カドスケ運営', true, 3)
ON CONFLICT DO NOTHING;

-- ========================================
-- 2. lottery_entries テーブル（抽選応募）
-- ========================================
CREATE TABLE IF NOT EXISTS lottery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES sponsor_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_invested integer NOT NULL CHECK (points_invested > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lottery_entries_item ON lottery_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_lottery_entries_user ON lottery_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_entries_item_user ON lottery_entries(item_id, user_id);

ALTER TABLE lottery_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own lottery entries" ON lottery_entries;
CREATE POLICY "Users can read own lottery entries"
  ON lottery_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lottery entries" ON lottery_entries;
CREATE POLICY "Users can insert own lottery entries"
  ON lottery_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all lottery entries" ON lottery_entries;
CREATE POLICY "Admins can read all lottery entries"
  ON lottery_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- 3. point_exchanges テーブル（交換履歴）
-- ========================================
CREATE TABLE IF NOT EXISTS point_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES sponsor_items(id),
  points_spent integer NOT NULL,
  type text NOT NULL CHECK (type IN ('exchange', 'lottery_entry')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_exchanges_user ON point_exchanges(user_id);

ALTER TABLE point_exchanges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own exchanges" ON point_exchanges;
CREATE POLICY "Users can read own exchanges"
  ON point_exchanges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own exchanges" ON point_exchanges;
CREATE POLICY "Users can insert own exchanges"
  ON point_exchanges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

SELECT 'Migration v6 completed!' AS result;
