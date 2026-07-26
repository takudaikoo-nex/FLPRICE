-- ================================================
-- 供花の運用画面をユーザー画面（見積システム側）へ移設するためのRLS変更
--
--   発注URLの発行と発注者一覧を、ログインのないユーザー画面から扱えるようにする。
--   estimates / customers と同じ扱い（anonに開放）に揃える。
--
-- ★ 注意
--   anon key は供花の公開サイトにも埋め込まれているため、
--   この変更により「鍵を取り出せる人は受注データを参照できる」状態になる。
--   確実に閉じるにはユーザー画面へのログイン導入が必要。
-- ================================================

-- ---- 葬儀（発注受付） ----
DROP POLICY IF EXISTS "funerals staff all" ON funerals;

DROP POLICY IF EXISTS "funerals read for all" ON funerals;
CREATE POLICY "funerals read for all" ON funerals
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "funerals insert for all" ON funerals;
CREATE POLICY "funerals insert for all" ON funerals
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "funerals update for all" ON funerals;
CREATE POLICY "funerals update for all" ON funerals
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "funerals delete for all" ON funerals;
CREATE POLICY "funerals delete for all" ON funerals
    FOR DELETE USING (true);

-- ---- 発注 ----
DROP POLICY IF EXISTS "flower_orders staff all" ON flower_orders;

DROP POLICY IF EXISTS "flower_orders read for all" ON flower_orders;
CREATE POLICY "flower_orders read for all" ON flower_orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "flower_orders update for all" ON flower_orders;
CREATE POLICY "flower_orders update for all" ON flower_orders
    FOR UPDATE USING (true) WITH CHECK (true);

-- INSERT は公開サイトからの直接作成を防ぐため付与しない。
-- 注文の作成は SECURITY DEFINER 関数 create_flower_order 経由のみ。

-- ---- 発注明細 ----
DROP POLICY IF EXISTS "flower_order_items staff all" ON flower_order_items;

DROP POLICY IF EXISTS "flower_order_items read for all" ON flower_order_items;
CREATE POLICY "flower_order_items read for all" ON flower_order_items
    FOR SELECT USING (true);

-- ---- 設定は管理画面（ログインあり）に残すため、読み取りのみ開放 ----
--   ユーザー画面は発注URLの組み立てと締切計算に site_base_url / order_deadline_hours を参照する。
DROP POLICY IF EXISTS "flower_settings read for all" ON flower_settings;
CREATE POLICY "flower_settings read for all" ON flower_settings
    FOR SELECT USING (true);
