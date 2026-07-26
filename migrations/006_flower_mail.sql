-- ================================================
-- 供花発注システム - メール送信 (P4)
--   ・お客様へ請求書メール（スタッフが確認してから送信）
--   ・自社へ受注通知メール（注文受付時）
--
-- SMTPの接続情報はこのテーブルには保存しません。
-- Supabase Edge Functions のシークレット（環境変数）に設定してください。
-- ================================================

-- ---- 請求書に記載する自社情報・送信元設定 ----
ALTER TABLE flower_settings
    ADD COLUMN IF NOT EXISTS company_name                text    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS company_postal_code         text    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS company_address             text    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS company_tel                 text    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS invoice_registration_number text    NOT NULL DEFAULT '',  -- インボイス登録番号
    ADD COLUMN IF NOT EXISTS bank_info                   text    NOT NULL DEFAULT '',  -- 振込先（複数行可）
    ADD COLUMN IF NOT EXISTS payment_due_days            integer NOT NULL DEFAULT 30,  -- 支払期限（注文日からの日数）
    ADD COLUMN IF NOT EXISTS mail_from                   text    NOT NULL DEFAULT '',  -- 送信元メールアドレス
    ADD COLUMN IF NOT EXISTS mail_from_name              text    NOT NULL DEFAULT '';  -- 送信元表示名

-- ---- 送信履歴 ----
ALTER TABLE flower_orders
    ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz,  -- 請求書をお客様へ送信した日時
    ADD COLUMN IF NOT EXISTS notified_at     timestamptz;  -- 自社へ受注通知を送信した日時

CREATE INDEX IF NOT EXISTS flower_orders_notified_at_idx
    ON flower_orders (notified_at) WHERE notified_at IS NULL;
