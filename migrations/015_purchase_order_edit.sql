-- ================================================
-- 供花発注システム - 発注書の調整（2026-07-31）
--
--   ・設営期日を葬儀ごとに登録できるようにする
--     （未設定なら従来どおり「告別式の開始まで」と本文に出す）
--   ・発注書に含める注文を手動で指定できるようにする
--     （未指定＝NULL のときはキャンセル済みを自動で除外する）
-- ================================================

ALTER TABLE funerals
    ADD COLUMN IF NOT EXISTS setup_deadline timestamptz;   -- 設営期日（業者への発注書に記載）

ALTER TABLE flower_orders
    ADD COLUMN IF NOT EXISTS include_in_purchase_order boolean;  -- NULL = 自動判定
