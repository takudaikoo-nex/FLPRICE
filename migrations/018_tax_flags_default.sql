-- ================================================
-- 税率フラグの既定値
--
--   ・非課税でも軽減税率でもないアイテム（標準税率10%）を
--     チェックを付けずに登録できるようにする
--   ・non_taxable が未設定のまま登録されると弾かれていたため、
--     既定値 false を入れて NOT NULL に揃える
-- ================================================

UPDATE items SET non_taxable = false WHERE non_taxable IS NULL;

ALTER TABLE items
    ALTER COLUMN non_taxable SET DEFAULT false;

ALTER TABLE items
    ALTER COLUMN non_taxable SET NOT NULL;
