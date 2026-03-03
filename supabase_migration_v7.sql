-- ==========================================
-- カドスケ！ マイグレーション v7
-- 交換フロー拡張: 配送タイプ・住所・ステータス管理
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- ========================================
-- 1. sponsor_items に delivery_type カラム追加
-- ========================================
ALTER TABLE sponsor_items ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'digital'
  CHECK (delivery_type IN ('physical', 'digital'));

-- ========================================
-- 2. profiles に配送先住所フィールド追加
-- ========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_zip text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_prefecture text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_building text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_phone text;

-- ========================================
-- 3. point_exchanges にフルフィルメントフィールド追加
-- ========================================
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'shipped', 'completed', 'cancelled'));
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS delivery_type text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS shipping_name text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS shipping_zip text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS shipping_prefecture text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS shipping_city text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS shipping_building text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS shipping_phone text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS fulfilled_by uuid REFERENCES profiles(id);

-- ========================================
-- 4. インデックス追加
-- ========================================
CREATE INDEX IF NOT EXISTS idx_point_exchanges_status ON point_exchanges(status, created_at);
CREATE INDEX IF NOT EXISTS idx_point_exchanges_type_status ON point_exchanges(type, status);

-- ========================================
-- 5. RLSポリシー（管理者用）
-- ========================================
DROP POLICY IF EXISTS "Admins can read all exchanges" ON point_exchanges;
CREATE POLICY "Admins can read all exchanges"
  ON point_exchanges FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update exchanges" ON point_exchanges;
CREATE POLICY "Admins can update exchanges"
  ON point_exchanges FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- 6. 既存シードデータの delivery_type 更新
-- ========================================
UPDATE sponsor_items SET delivery_type = 'physical' WHERE name = '限定スリーブ';
UPDATE sponsor_items SET delivery_type = 'physical' WHERE name = 'ドリンクチケット';

SELECT 'Migration v7 completed!' AS result;
