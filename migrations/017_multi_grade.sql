-- ================================================
-- 数量入力型アイテム（multi_grade）
--
--   ・グレードごとに個数を入力して金額を計算する（供花など）
--   ・小計に対して金額または％の割引を指定できる
--   ・個数と割引の内容は estimates.content に保存するため、
--     items 側はアイテム種別を増やすだけでよい
-- ================================================

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_type_check;

ALTER TABLE items
    ADD CONSTRAINT items_type_check
    CHECK (type IN ('included', 'checkbox', 'dropdown', 'tier_dependent', 'free_input', 'multi_grade'));

-- 供花を数量入力型に切り替える
UPDATE items
SET type = 'multi_grade',
    description = '会社関係や親族が出すお花です。グレードごとに本数を入力してください。祭壇との組み合わせで手配いたします。'
WHERE name = '供花';
