-- ================================================
-- 喪主に見せ始めるタイミングをタスクごとに持たせる
--
--   支払い関連は、打ち合わせ中の画面に出ていると場面として良くないため、
--   告別式が終わってから表示する。
--
--   決め打ちで「支払いフェーズだけ」にすると、あとから
--   「これも葬儀後でいい」が出たときに改修になるため、
--   タスクごとの設定にして /admin から変えられるようにする。
--
--   前提: migrations/019_case_tasks.sql
-- ================================================

ALTER TABLE case_task_templates
    ADD COLUMN IF NOT EXISTS mourner_visible_from text NOT NULL DEFAULT 'always'
        CHECK (mourner_visible_from IN ('always', 'after_ceremony'));

ALTER TABLE case_tasks
    ADD COLUMN IF NOT EXISTS mourner_visible_from text NOT NULL DEFAULT 'always'
        CHECK (mourner_visible_from IN ('always', 'after_ceremony'));

COMMENT ON COLUMN case_task_templates.mourner_visible_from IS
    'always = 常に表示 / after_ceremony = 告別式の翌日から表示（請求書の発行済みなら日付に関わらず表示）';

-- ---- 支払いフェーズは葬儀後から ----
UPDATE case_task_templates
SET mourner_visible_from = 'after_ceremony'
WHERE phase = 'payment';

UPDATE case_tasks
SET mourner_visible_from = 'after_ceremony'
WHERE phase = 'payment';

-- ================================================
-- 確認用
-- ================================================
SELECT sort_order, code, title, phase, owner, visible_to_mourner, mourner_visible_from
FROM case_task_templates
ORDER BY sort_order;
