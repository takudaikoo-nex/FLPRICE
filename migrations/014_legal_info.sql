-- ================================================
-- 特定商取引法に基づく表記・プライバシーポリシー用の情報
--
--   供花サイトのフッターから開くページに表示する。
--   請求書で使っている事業者情報（company_*）をそのまま流用し、
--   足りない項目だけ追加する。
-- ================================================

ALTER TABLE flower_settings
    ADD COLUMN IF NOT EXISTS representative_name text NOT NULL DEFAULT '',  -- 運営統括責任者
    ADD COLUMN IF NOT EXISTS contact_tel         text NOT NULL DEFAULT '',  -- 問い合わせ電話番号（未設定なら company_tel を使う）
    ADD COLUMN IF NOT EXISTS contact_hours       text NOT NULL DEFAULT '24時間365日受付',
    ADD COLUMN IF NOT EXISTS cancellation_policy text NOT NULL DEFAULT '',  -- 返品・キャンセルについて
    ADD COLUMN IF NOT EXISTS privacy_note        text NOT NULL DEFAULT '';  -- プライバシーポリシーの補足

-- 公開済みの問い合わせ番号を初期値として入れておく
UPDATE flower_settings
SET contact_tel = '0467-38-5617'
WHERE id = 1 AND contact_tel = '';

UPDATE flower_settings
SET cancellation_policy = 'ご注文後のキャンセル・変更は、受付締切前までにお電話にてご連絡ください。'
                       || E'\n'
                       || '受付締切後は、すでに商品の手配に入っているためキャンセルを承れません。'
                       || E'\n'
                       || '商品の性質上、お客様のご都合による返品はお受けしておりません。'
                       || E'\n'
                       || '万一、商品に不備があった場合は速やかにご連絡ください。'
WHERE id = 1 AND cancellation_policy = '';
