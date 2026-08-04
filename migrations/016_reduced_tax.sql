-- ================================================
-- 軽減税率 8%（会葬御礼品など食品）
--
--   ・アイテムごとに軽減税率対象かどうかを持たせる
--   ・非課税（non_taxable）とは排他で運用する（UI側で制御）
-- ================================================

ALTER TABLE items
    ADD COLUMN IF NOT EXISTS reduced_tax boolean NOT NULL DEFAULT false;
