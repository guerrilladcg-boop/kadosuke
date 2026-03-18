-- ==========================================
-- カドスケ！ マイグレーション v23
-- リーグ: 傾斜配点 + 終了通知
-- 実行場所: Supabase Dashboard > SQL Editor
-- ==========================================

-- ====== 順位点式の傾斜配点フラグ ======
-- true の場合、各ラウンドの参加人数で配点に倍率をかける
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS ranking_scale_by_participants boolean NOT NULL DEFAULT false;

-- ====== リーグ終了通知用テーブル ======
-- リーグ完了時に参加者へ通知を送り、結果モーダルを表示するためのテーブル
CREATE TABLE IF NOT EXISTS league_completion_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_league_comp_notif_user ON league_completion_notifications(user_id);

ALTER TABLE league_completion_notifications ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の通知を閲覧・更新可能
DROP POLICY IF EXISTS "Users can view own league notifications" ON league_completion_notifications;
CREATE POLICY "Users can view own league notifications" ON league_completion_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own league notifications" ON league_completion_notifications;
CREATE POLICY "Users can update own league notifications" ON league_completion_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- リーグオーナーが通知を作成可能
DROP POLICY IF EXISTS "League owners can insert notifications" ON league_completion_notifications;
CREATE POLICY "League owners can insert notifications" ON league_completion_notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_completion_notifications.league_id AND leagues.created_by = auth.uid())
  );

-- ====== league_round_results に参加人数カラム追加（傾斜配点計算用） ======
ALTER TABLE league_round_results ADD COLUMN IF NOT EXISTS round_player_count integer;

SELECT 'Migration v23 completed! 傾斜配点 + リーグ終了通知機能追加完了' AS result;
