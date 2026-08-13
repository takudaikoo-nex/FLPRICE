-- ================================================
-- 供花のクレジットカード決済（Stripe）
--
--   ・注文と Stripe の PaymentIntent を1対1で紐づける
--   ・入金の確定は Webhook で行うため、決済IDから注文を引けるようにする
--   ・payment_status は既存の列をそのまま使う
--       pending → paid / failed
-- ================================================

ALTER TABLE flower_orders
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
    ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Webhook は決済IDから注文を引くので、重複を許さず索引を張る
CREATE UNIQUE INDEX IF NOT EXISTS flower_orders_stripe_payment_intent_id_key
    ON flower_orders (stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;
