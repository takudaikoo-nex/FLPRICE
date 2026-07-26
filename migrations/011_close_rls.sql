-- ================================================
-- RLSを閉じる（見積システムへのログイン導入とセット）
--
--   ・見積システム（ユーザー画面）にログインを追加したため、
--     業務データはすべて「ログイン済み（authenticated）」のみに限定する。
--   ・供花の公開サイトは Edge Function（flower-public）経由に切り替えたため、
--     anon からのテーブルアクセスは一切不要になった。
--
--   このファイルは 010_flower_internal_access.sql の変更を打ち消す。
-- ================================================

-- ---- 見積 ----
DROP POLICY IF EXISTS "Enable insert for all users" ON estimates;
DROP POLICY IF EXISTS "Enable read for all users"   ON estimates;
DROP POLICY IF EXISTS "Enable update for all users" ON estimates;

DROP POLICY IF EXISTS "estimates staff all" ON estimates;
CREATE POLICY "estimates staff all" ON estimates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- 顧客 ----
DROP POLICY IF EXISTS "customers read for all"   ON customers;
DROP POLICY IF EXISTS "customers insert for all" ON customers;
DROP POLICY IF EXISTS "customers update for all" ON customers;
DROP POLICY IF EXISTS "customers delete for staff" ON customers;

DROP POLICY IF EXISTS "customers staff all" ON customers;
CREATE POLICY "customers staff all" ON customers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- 葬儀（発注受付） ----
DROP POLICY IF EXISTS "funerals read for all"   ON funerals;
DROP POLICY IF EXISTS "funerals insert for all" ON funerals;
DROP POLICY IF EXISTS "funerals update for all" ON funerals;
DROP POLICY IF EXISTS "funerals delete for all" ON funerals;

DROP POLICY IF EXISTS "funerals staff all" ON funerals;
CREATE POLICY "funerals staff all" ON funerals
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- 発注 ----
DROP POLICY IF EXISTS "flower_orders read for all"   ON flower_orders;
DROP POLICY IF EXISTS "flower_orders update for all" ON flower_orders;

DROP POLICY IF EXISTS "flower_orders staff all" ON flower_orders;
CREATE POLICY "flower_orders staff all" ON flower_orders
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- 発注明細 ----
DROP POLICY IF EXISTS "flower_order_items read for all" ON flower_order_items;

DROP POLICY IF EXISTS "flower_order_items staff all" ON flower_order_items;
CREATE POLICY "flower_order_items staff all" ON flower_order_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- 設定 ----
DROP POLICY IF EXISTS "flower_settings read for all" ON flower_settings;
-- staff向けのポリシー（004で作成）はそのまま残す

-- ---- 供花商品 ----
--   公開サイトは Edge Function 経由になったため、anon への公開読み取りを廃止する。
DROP POLICY IF EXISTS "flower_products public read" ON flower_products;

-- ================================================
-- 公開サイト用のDB関数は Edge Function（service role）からのみ呼ぶ
-- ================================================
REVOKE EXECUTE ON FUNCTION funeral_public_lookup(text) FROM anon;
REVOKE EXECUTE ON FUNCTION create_flower_order(text, jsonb, jsonb, text) FROM anon;

-- ================================================
-- 確認用
--   plans / items / attendee_options は個人情報を含まないため公開読み取りのまま。
-- ================================================
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('estimates', 'customers', 'funerals',
                    'flower_orders', 'flower_order_items',
                    'flower_products', 'flower_settings')
ORDER BY tablename, policyname;
