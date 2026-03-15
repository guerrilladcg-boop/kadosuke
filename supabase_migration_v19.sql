-- ========================================
-- v19: 協賛商品の削除対応
-- point_exchanges の外部キーに ON DELETE CASCADE を追加
-- 管理者用 DELETE ポリシーを追加
-- ========================================

-- point_exchanges: item_id の FK を CASCADE 付きに変更
ALTER TABLE point_exchanges DROP CONSTRAINT IF EXISTS point_exchanges_item_id_fkey;
ALTER TABLE point_exchanges ADD CONSTRAINT point_exchanges_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES sponsor_items(id) ON DELETE CASCADE;

-- point_exchanges: 管理者が削除できるポリシーを追加
DROP POLICY IF EXISTS "Admins can delete exchanges" ON point_exchanges;
CREATE POLICY "Admins can delete exchanges" ON point_exchanges FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- lottery_entries: 管理者が削除できるポリシーを追加（念のため）
DROP POLICY IF EXISTS "Admins can delete lottery entries" ON lottery_entries;
CREATE POLICY "Admins can delete lottery entries" ON lottery_entries FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- 即時抽選の景品在庫を無限（NULL）に設定可能にする
-- ========================================
ALTER TABLE instant_lottery_prizes ALTER COLUMN stock DROP NOT NULL;
ALTER TABLE instant_lottery_prizes DROP CONSTRAINT IF EXISTS instant_lottery_prizes_stock_check;
ALTER TABLE instant_lottery_prizes ADD CONSTRAINT instant_lottery_prizes_stock_check
  CHECK (stock IS NULL OR stock >= 0);

-- ========================================
-- 即時抽選の景品削除対応
-- instant_lottery_results.prize_id の FK に ON DELETE SET NULL を追加
-- （結果履歴は残しつつ景品の削除を可能にする）
-- ========================================
ALTER TABLE instant_lottery_results DROP CONSTRAINT IF EXISTS instant_lottery_results_prize_id_fkey;
ALTER TABLE instant_lottery_results ADD CONSTRAINT instant_lottery_results_prize_id_fkey
  FOREIGN KEY (prize_id) REFERENCES instant_lottery_prizes(id) ON DELETE SET NULL;

-- ========================================
-- 抽選期間の設定対応
-- sponsor_items に lottery_start_at, lottery_end_at カラムを追加
-- （期間外になると自動的にユーザーに非表示になる）
-- ========================================
ALTER TABLE sponsor_items ADD COLUMN IF NOT EXISTS lottery_start_at TIMESTAMPTZ;
ALTER TABLE sponsor_items ADD COLUMN IF NOT EXISTS lottery_end_at TIMESTAMPTZ;
