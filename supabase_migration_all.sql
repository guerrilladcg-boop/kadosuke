-- ============================================
-- カドスケ！ 一括マイグレーション (v1〜v8)
-- Supabase Dashboard > SQL Editor にコピペして実行
-- 何度実行してもエラーになりません
-- ============================================

-- ========================================
-- profiles テーブル拡張
-- ========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organizer_status text NOT NULL DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_names jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_display_name_index integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_type text CHECK (premium_type IN ('onetime', 'monthly'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_tournament_entry boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_favorite_organizer boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_sponsor_items boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_zip text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_prefecture text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_building text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_phone text;

-- organizer_status CHECK制約
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizer_status') THEN
    ALTER TABLE profiles ADD CONSTRAINT chk_organizer_status CHECK (organizer_status IN ('none', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 既存データ移行
UPDATE profiles SET organizer_status = 'approved' WHERE is_organizer = true AND organizer_status = 'none';

-- profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ========================================
-- サインアップ時 profiles 自動作成トリガー
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, push_notifications_enabled, is_public, is_premium)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(split_part(NEW.email, '@', 1), 'プレイヤー'),
    true, true, false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 既存ユーザーで profiles がないユーザーを作成
INSERT INTO public.profiles (id, email, name, push_notifications_enabled, is_public, is_premium)
SELECT au.id, au.email, COALESCE(split_part(au.email, '@', 1), 'プレイヤー'), true, true, false
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- ========================================
-- organizer_applications テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS organizer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  reason text,
  x_account text,
  tonamel_url text
);

-- 既にテーブルがある場合のカラム追加
ALTER TABLE organizer_applications ADD COLUMN IF NOT EXISTS x_account text;
ALTER TABLE organizer_applications ADD COLUMN IF NOT EXISTS tonamel_url text;

CREATE INDEX IF NOT EXISTS idx_org_app_status ON organizer_applications(status);
CREATE INDEX IF NOT EXISTS idx_org_app_user ON organizer_applications(user_id);

ALTER TABLE organizer_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own applications" ON organizer_applications;
CREATE POLICY "Users can read own applications" ON organizer_applications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own application" ON organizer_applications;
CREATE POLICY "Users can insert own application" ON organizer_applications FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can read all applications" ON organizer_applications;
CREATE POLICY "Admins can read all applications" ON organizer_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update applications" ON organizer_applications;
CREATE POLICY "Admins can update applications" ON organizer_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- ad_views テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS ad_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  points_earned integer NOT NULL DEFAULT 50
);

CREATE INDEX IF NOT EXISTS idx_ad_views_user_date ON ad_views(user_id, viewed_at);

ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ad views" ON ad_views;
CREATE POLICY "Users can read own ad views" ON ad_views FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ad view" ON ad_views;
CREATE POLICY "Users can insert own ad view" ON ad_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- tournament_results テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS tournament_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ranking integer,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  deck_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tr_user ON tournament_results(user_id);
CREATE INDEX IF NOT EXISTS idx_tr_tournament ON tournament_results(tournament_id);

ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own results" ON tournament_results;
CREATE POLICY "Users can view own results" ON tournament_results FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own results" ON tournament_results;
CREATE POLICY "Users can insert own results" ON tournament_results FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own results" ON tournament_results;
CREATE POLICY "Users can update own results" ON tournament_results FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own results" ON tournament_results;
CREATE POLICY "Users can delete own results" ON tournament_results FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can view tournament results" ON tournament_results;
CREATE POLICY "Organizers can view tournament results" ON tournament_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_results.tournament_id AND t.created_by = auth.uid()));

-- ========================================
-- game_masters テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS game_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#888888',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_masters_active ON game_masters(is_active, sort_order);

ALTER TABLE game_masters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active games" ON game_masters;
CREATE POLICY "Anyone can read active games" ON game_masters FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage games" ON game_masters;
CREATE POLICY "Admins can manage games" ON game_masters FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

INSERT INTO game_masters (name, color, sort_order) VALUES
  ('ポケモンカードゲーム', '#E8341C', 1),
  ('ONE PIECEカードゲーム', '#D42B1E', 2),
  ('デュエル・マスターズ', '#1E90FF', 3),
  ('Pokémon Trading Card Game Pocket', '#FFB800', 4),
  ('遊戯王マスターデュエル', '#6B4C9A', 5),
  ('神託のメソロギア', '#2E8B57', 6),
  ('遊戯王OCG', '#7B2D8E', 7),
  ('蟲神器', '#4A7028', 8),
  ('ウルトラマン カードゲーム', '#C41E3A', 9),
  ('デジモンカードゲーム', '#0077C8', 10),
  ('ユニオンアリーナ', '#E65100', 11),
  ('DUEL MASTERS PLAY''S', '#1565C0', 12),
  ('ホロライブ カードゲーム', '#33CCFF', 13),
  ('ShadowverseEVOLVE', '#4A90D9', 14),
  ('Shadowverse:Worlds beyond', '#3A7BD5', 15)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- tag_masters テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS tag_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_masters_active ON tag_masters(is_active, sort_order);

ALTER TABLE tag_masters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active tags" ON tag_masters;
CREATE POLICY "Anyone can read active tags" ON tag_masters FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage tags" ON tag_masters;
CREATE POLICY "Admins can manage tags" ON tag_masters FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

INSERT INTO tag_masters (label, category, sort_order) VALUES
  ('初心者歓迎', 'general', 1),
  ('賞金つき', 'reward', 2),
  ('景品つき', 'reward', 3),
  ('配信あり', 'general', 4)
ON CONFLICT (label) DO NOTHING;

-- ========================================
-- tournaments テーブル拡張
-- ========================================
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee_type text DEFAULT 'free';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee_amount integer;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'offline';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prefecture text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_entry_fee_type_check') THEN
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_entry_fee_type_check CHECK (entry_fee_type IN ('free', 'paid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_location_type_check') THEN
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_location_type_check CHECK (location_type IN ('online', 'offline'));
  END IF;
END $$;

-- ========================================
-- sponsor_items テーブル
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

ALTER TABLE sponsor_items ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'digital';
ALTER TABLE sponsor_items ADD COLUMN IF NOT EXISTS lottery_type text;

-- delivery_type CHECK制約
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sponsor_items_delivery_type_check') THEN
    ALTER TABLE sponsor_items ADD CONSTRAINT sponsor_items_delivery_type_check CHECK (delivery_type IN ('physical', 'digital'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sponsor_items_lottery_type_check') THEN
    ALTER TABLE sponsor_items ADD CONSTRAINT sponsor_items_lottery_type_check CHECK (lottery_type IN ('instant', 'application'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sponsor_items_active ON sponsor_items(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_sponsor_items_type ON sponsor_items(type, is_active);

ALTER TABLE sponsor_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active sponsor items" ON sponsor_items;
CREATE POLICY "Anyone can read active sponsor items" ON sponsor_items FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can read all sponsor items" ON sponsor_items;
CREATE POLICY "Admins can read all sponsor items" ON sponsor_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can manage sponsor items" ON sponsor_items;
CREATE POLICY "Admins can manage sponsor items" ON sponsor_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 既存の抽選アイテムを応募抽選に設定
UPDATE sponsor_items SET lottery_type = 'application' WHERE type = 'lottery' AND lottery_type IS NULL;

-- シードデータ
INSERT INTO sponsor_items (name, description, icon, point_cost, type, sponsor_name, is_active, sort_order) VALUES
  ('限定スリーブ', '大会限定デザインのカードスリーブ', '🃏', 500, 'exchange', 'カドスケ運営', true, 1),
  ('ドリンクチケット', 'オフライン大会で使えるドリンク引換券', '🥤', 150, 'exchange', 'カドスケ運営', true, 2),
  ('「激選」最新BOX', '最新弾のBOXが当たる抽選！投票口数が多いほど当選確率UP！', '🎰', 100, 'lottery', 'カドスケ運営', true, 3)
ON CONFLICT DO NOTHING;

UPDATE sponsor_items SET delivery_type = 'physical' WHERE name IN ('限定スリーブ', 'ドリンクチケット');

-- ========================================
-- lottery_entries テーブル
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
CREATE POLICY "Users can read own lottery entries" ON lottery_entries FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lottery entries" ON lottery_entries;
CREATE POLICY "Users can insert own lottery entries" ON lottery_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all lottery entries" ON lottery_entries;
CREATE POLICY "Admins can read all lottery entries" ON lottery_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- point_exchanges テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS point_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES sponsor_items(id),
  points_spent integer NOT NULL,
  type text NOT NULL DEFAULT 'exchange',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE point_exchanges ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
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

-- type制約を最新版に更新
ALTER TABLE point_exchanges DROP CONSTRAINT IF EXISTS point_exchanges_type_check;
ALTER TABLE point_exchanges ADD CONSTRAINT point_exchanges_type_check
  CHECK (type IN ('exchange', 'lottery_entry', 'instant_lottery'));

-- status制約
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'point_exchanges_status_check') THEN
    ALTER TABLE point_exchanges ADD CONSTRAINT point_exchanges_status_check
      CHECK (status IN ('pending', 'shipped', 'completed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_point_exchanges_user ON point_exchanges(user_id);
CREATE INDEX IF NOT EXISTS idx_point_exchanges_status ON point_exchanges(status, created_at);
CREATE INDEX IF NOT EXISTS idx_point_exchanges_type_status ON point_exchanges(type, status);

ALTER TABLE point_exchanges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own exchanges" ON point_exchanges;
CREATE POLICY "Users can read own exchanges" ON point_exchanges FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own exchanges" ON point_exchanges;
CREATE POLICY "Users can insert own exchanges" ON point_exchanges FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all exchanges" ON point_exchanges;
CREATE POLICY "Admins can read all exchanges" ON point_exchanges FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update exchanges" ON point_exchanges;
CREATE POLICY "Admins can update exchanges" ON point_exchanges FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- instant_lottery_prizes テーブル
-- ========================================
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

ALTER TABLE instant_lottery_prizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read instant lottery prizes" ON instant_lottery_prizes;
CREATE POLICY "Anyone can read instant lottery prizes" ON instant_lottery_prizes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sponsor_items
    WHERE sponsor_items.id = instant_lottery_prizes.item_id
    AND sponsor_items.is_active = true
  ));

DROP POLICY IF EXISTS "Admins can manage instant lottery prizes" ON instant_lottery_prizes;
CREATE POLICY "Admins can manage instant lottery prizes" ON instant_lottery_prizes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- instant_lottery_results テーブル
-- ========================================
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

ALTER TABLE instant_lottery_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own instant lottery results" ON instant_lottery_results;
CREATE POLICY "Users can read own instant lottery results" ON instant_lottery_results FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own instant lottery results" ON instant_lottery_results;
CREATE POLICY "Users can insert own instant lottery results" ON instant_lottery_results FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all instant lottery results" ON instant_lottery_results;
CREATE POLICY "Admins can read all instant lottery results" ON instant_lottery_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- 完了
-- ========================================
SELECT 'All migrations (v1-v8) completed successfully!' AS result;
