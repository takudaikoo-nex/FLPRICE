-- ================================================
-- 供花発注システム - 業者への発注書 (P4-2)
--   ・業者は当面1社固定。設定に業者名とメールアドレスを持つ
--   ・発注書は葬儀（＝故人）単位で、その葬儀の全注文をまとめて1通送る
-- ================================================

ALTER TABLE flower_settings
    ADD COLUMN IF NOT EXISTS supplier_name  text NOT NULL DEFAULT '',   -- 供花業者の名称
    ADD COLUMN IF NOT EXISTS supplier_email text NOT NULL DEFAULT '';   -- 発注書の送信先

ALTER TABLE funerals
    ADD COLUMN IF NOT EXISTS purchase_order_sent_at timestamptz;        -- 発注書を送信した日時
