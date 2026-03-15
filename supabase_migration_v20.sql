-- =============================================
-- Migration v20: 即時抽選 景品配送タイプ + ギフトコード
-- =============================================

-- 即時抽選景品に配送タイプを追加（digital / physical / gift_code）
ALTER TABLE instant_lottery_prizes ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'digital';

-- point_exchanges にギフトコード・景品名カラムを追加
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS gift_code TEXT;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS prize_name TEXT;
ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS prize_icon TEXT;
