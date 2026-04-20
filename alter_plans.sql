-- ================================================
-- Plans テーブルに display_order カラムを追加
-- ================================================
ALTER TABLE plans ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 現在の金額（price）順に初期の並び順（display_order）を割り振る
WITH ordered_plans AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY price ASC) as new_order
  FROM plans
)
UPDATE plans
SET display_order = ordered_plans.new_order
FROM ordered_plans
WHERE plans.id = ordered_plans.id;
