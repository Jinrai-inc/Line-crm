-- seminarsテーブルに不足カラムを追加
-- payment_url, zoom_url, price, post_payment_url, zoom_note, post_payment_message, tag_ids

-- event_dateをNULLABLEに変更（日付未定対応）
ALTER TABLE seminars ALTER COLUMN event_date DROP NOT NULL;

-- 決済・予約関連
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS price INTEGER;

-- Zoom関連
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS zoom_url TEXT;
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS zoom_note TEXT;

-- 決済後URL（TimeRex等）
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS post_payment_url TEXT;
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS post_payment_message TEXT;

-- タグ紐付け
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS tag_ids UUID[] DEFAULT '{}';

-- =============================================
-- stripe_settingsテーブル: 決済後自動メッセージ設定カラム追加
-- =============================================

ALTER TABLE stripe_settings ADD COLUMN IF NOT EXISTS payment_auto_enabled BOOLEAN DEFAULT false;
ALTER TABLE stripe_settings ADD COLUMN IF NOT EXISTS payment_auto_url TEXT;
ALTER TABLE stripe_settings ADD COLUMN IF NOT EXISTS payment_auto_message TEXT;
ALTER TABLE stripe_settings ADD COLUMN IF NOT EXISTS payment_auto_button_text TEXT;
ALTER TABLE stripe_settings ADD COLUMN IF NOT EXISTS payment_auto_title TEXT;
