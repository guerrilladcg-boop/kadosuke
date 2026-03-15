-- ==========================================
-- カドスケ！ マイグレーション v9
-- 商品画像URL カラム追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- sponsor_items に画像URLカラム追加
ALTER TABLE sponsor_items ADD COLUMN IF NOT EXISTS image_url text;

SELECT 'Migration v9 completed! image_url カラム追加完了' AS result;
