-- ==========================================
-- カドスケ！ マイグレーション v14
-- レベルシステム
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- レベル・経験値カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience integer NOT NULL DEFAULT 0;

SELECT 'Migration v14 completed! レベルシステム作成完了' AS result;
