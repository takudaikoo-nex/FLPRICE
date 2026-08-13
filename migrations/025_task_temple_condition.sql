-- ================================================
-- お坊さんを呼ぶ案件だけに作るタスク（位牌の回収）
--
--   位牌の回収のように「お坊さんを呼ぶ場合だけ喪主にお願いすること」がある。
--   常に出すと、無宗教・火葬式の案件に意味のないタスクが残るため、
--   供花（require_flower）と同じかたちで生成条件を1つ増やす。
--
--   お坊さんの有無は商談画面にフラグがないため（要件 A-6 待ち）、
--     ・菩提寺の名称／電話／FAX のいずれかが入っている
--     ・お布施・戒名料（アイテム 53）に金額が入っている
--   のどちらかで推し量る。判定は lib/caseTasks.ts の hasTempleSupport。
--
--   前提: migrations/019_case_tasks.sql
-- ================================================

ALTER TABLE case_task_templates
    ADD COLUMN IF NOT EXISTS require_temple boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN case_task_templates.require_temple IS
    'true = お坊さん（菩提寺）ありと判定した案件だけタスクを作る';

-- ---- 位牌の回収 ----
--   運用に入れるかがまだ決まっていないため is_active = false で登録しておく。
--   /admin の「タスクマスタ管理」で「有効にする」を入れると、次のタスク生成から作られる。
--   文言・期日・担当は同じ画面で変えられる。
INSERT INTO case_task_templates
    (code, title, description, phase, owner, visible_to_mourner, mourner_visible_from,
     target_categories, target_plan_ids, related_item_id, require_flower, require_temple,
     due_offset_days, auto_complete_on, initial_status, sort_order, is_active)
VALUES
    ('ihai_return', '位牌の回収', '',
     'after', 'mourner', true, 'always',
     '{}', '{}', (SELECT id FROM items WHERE id = 9), false, true,
     NULL, NULL, 'todo', 210, false)
ON CONFLICT (code) DO NOTHING;

-- 坊さん連絡FAX（社内作業）も本来は同じ条件だが、
-- いまは「常に作って、菩提寺なしの案件はスタッフが対象外にする」運用のため触らない。
-- そちらも条件で絞るなら次の1行を実行する。
-- UPDATE case_task_templates SET require_temple = true WHERE code = 'temple_fax';

-- ================================================
-- 確認用
-- ================================================
SELECT sort_order, code, title, phase, owner, visible_to_mourner,
       related_item_id, require_flower, require_temple, is_active
FROM case_task_templates
ORDER BY sort_order;
