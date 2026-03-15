-- ==========================================
-- カドスケ！ マイグレーション v15
-- 戦績記録（深堀り）
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- W/L戦績カラム追加
ALTER TABLE results ADD COLUMN IF NOT EXISTS wins integer NOT NULL DEFAULT 0;
ALTER TABLE results ADD COLUMN IF NOT EXISTS losses integer NOT NULL DEFAULT 0;
ALTER TABLE results ADD COLUMN IF NOT EXISTS draws integer NOT NULL DEFAULT 0;

-- デッキ名・メモカラム追加
ALTER TABLE results ADD COLUMN IF NOT EXISTS deck_name text;
ALTER TABLE results ADD COLUMN IF NOT EXISTS notes text;

SELECT 'Migration v15 completed! 戦績記録（深堀り）カラム追加完了' AS result;
