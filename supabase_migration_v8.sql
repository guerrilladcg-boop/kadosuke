-- ========================================
-- カドスケ！ マイグレーション v8
-- 2種類の抽選システム（即時抽選 + 応募抽選）
-- ========================================

-- 1. sponsor_items に lottery_type カラム追加
ALTER TABLE sponsor_items ADD COLUMN IF NOT EXISTS lottery_type text
  CHECK (lottery_type IN ('instant', 'application'));

-- 既存の抽選アイテムを応募抽選に設定
UPDATE sponsor_items SET lottery_type = 'application' WHERE type = 'lottery' AND lottery_type IS NULL;

-- 2. 即時抽選の景品プールテーブル
CREATE TABLE IF NOT EXISTS instant_lottery_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES sponsor_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🎁',
  probability_weight integer NOT NULL CHECK (probability_weight > 0),
  stock integer NOT NULL CHECK (stock >= 0),
  is_winning boolean NOT NULL DEFAULT false,
  point_refund integer NOT NULL DEFAULT 0 CHECK (point_refund >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instant_prizes_item ON instant_lottery_prizes(item_id);

-- 3. 即時抽選の結果履歴テーブル
CREATE TABLE IF NOT EXISTS instant_lottery_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES sponsor_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prize_id uuid REFERENCES instant_lottery_prizes(id),
  is_win boolean NOT NULL DEFAULT false,
  points_spent integer NOT NULL,
  points_refunded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instant_results_user ON instant_lottery_results(user_id);
CREATE INDEX IF NOT EXISTS idx_instant_results_item ON instant_lottery_results(item_id);

-- 4. point_exchanges の type 制約を更新（instant_lottery を追加）
ALTER TABLE point_exchanges DROP CONSTRAINT IF EXISTS point_exchanges_type_check;
ALTER TABLE point_exchanges ADD CONSTRAINT point_exchanges_type_check
  CHECK (type IN ('exchange', 'lottery_entry', 'instant_lottery'));

-- 5. RLS ポリシー

-- instant_lottery_prizes
ALTER TABLE instant_lottery_prizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read instant lottery prizes" ON instant_lottery_prizes;
CREATE POLICY "Anyone can read instant lottery prizes"
  ON instant_lottery_prizes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sponsor_items
    WHERE sponsor_items.id = instant_lottery_prizes.item_id
    AND sponsor_items.is_active = true
  ));

DROP POLICY IF EXISTS "Admins can manage instant lottery prizes" ON instant_lottery_prizes;
CREATE POLICY "Admins can manage instant lottery prizes"
  ON instant_lottery_prizes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- instant_lottery_results
ALTER TABLE instant_lottery_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own instant lottery results" ON instant_lottery_results;
CREATE POLICY "Users can read own instant lottery results"
  ON instant_lottery_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own instant lottery results" ON instant_lottery_results;
CREATE POLICY "Users can insert own instant lottery results"
  ON instant_lottery_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all instant lottery results" ON instant_lottery_results;
CREATE POLICY "Admins can read all instant lottery results"
  ON instant_lottery_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
