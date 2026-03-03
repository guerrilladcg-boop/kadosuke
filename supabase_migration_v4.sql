-- ==========================================
-- カドスケ！ マイグレーション v4
-- 通知種別カラムの追加
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- 1. 通知種別カラムを profiles テーブルに追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_tournament_entry boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_favorite_organizer boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_sponsor_items boolean NOT NULL DEFAULT true;

-- 2. 既存ユーザーはすべてデフォルト true なので特別な移行処理は不要

SELECT 'Migration v4 completed! 通知種別カラム追加完了' AS result;
