-- ================================================
-- 見積システム 要件① 顧客DBベース管理
--
--   ・顧客（ご葬家）を「箱」として管理する customers テーブルを新設
--   ・estimates に customer_id を追加して紐付ける
--   ・既存の見積は customer_info から顧客を作って自動で紐付ける
--   ・顧客情報が未入力の見積は customer_id = NULL のまま（後から紐付け可能）
-- ================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---- 顧客番号の連番 ----
CREATE SEQUENCE IF NOT EXISTS customer_no_seq START 1;

-- ---- 顧客 ----
CREATE TABLE IF NOT EXISTS customers (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_no text UNIQUE NOT NULL
                  DEFAULT 'C-' || lpad(nextval('customer_no_seq')::text, 6, '0'),
    name        text NOT NULL,                 -- 顧客名（ご葬家名）
    kana        text NOT NULL DEFAULT '',
    phone       text NOT NULL DEFAULT '',
    postal_code text NOT NULL DEFAULT '',
    address     text NOT NULL DEFAULT '',
    note        text NOT NULL DEFAULT '',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_name_idx  ON customers (name);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);

-- ---- 見積との紐付け ----
ALTER TABLE estimates
    ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS estimates_customer_id_idx ON estimates (customer_id);

-- ---- updated_at トリガー ----
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 既存データの移行
--   顧客名は 申込者名 → 喪主名 → 故人名 の順に採用する。
--   いずれも空の見積は紐付けずに残す（画面から手動で紐付けられる）。
-- ================================================
DO $$
DECLARE
    rec         RECORD;
    v_name      text;
    v_phone     text;
    v_customer  uuid;
BEGIN
    FOR rec IN
        SELECT id, customer_info
        FROM estimates
        WHERE customer_id IS NULL
        ORDER BY id
    LOOP
        v_name := COALESCE(
            NULLIF(btrim(rec.customer_info->>'applicantName'), ''),
            NULLIF(btrim(rec.customer_info->>'chiefMournerName'), ''),
            NULLIF(btrim(rec.customer_info->>'deceasedName'), '')
        );

        CONTINUE WHEN v_name IS NULL;

        v_phone := COALESCE(
            NULLIF(btrim(rec.customer_info->>'applicantPhone'), ''),
            NULLIF(btrim(rec.customer_info->>'chiefMournerPhone'), ''),
            NULLIF(btrim(rec.customer_info->>'chiefMournerMobile'), ''),
            ''
        );

        -- 同名の顧客がいれば再利用、いなければ作成
        SELECT id INTO v_customer FROM customers WHERE name = v_name LIMIT 1;

        IF v_customer IS NULL THEN
            INSERT INTO customers (name, phone, postal_code, address)
            VALUES (
                v_name,
                v_phone,
                COALESCE(NULLIF(btrim(rec.customer_info->>'applicantPostalCode'), ''), ''),
                COALESCE(
                    NULLIF(btrim(rec.customer_info->>'applicantAddress'), ''),
                    NULLIF(btrim(rec.customer_info->>'chiefMournerAddress'), ''),
                    ''
                )
            )
            RETURNING id INTO v_customer;
        ELSIF v_phone <> '' THEN
            -- 電話番号が未登録なら補完する
            UPDATE customers SET phone = v_phone WHERE id = v_customer AND phone = '';
        END IF;

        UPDATE estimates SET customer_id = v_customer WHERE id = rec.id;
    END LOOP;
END $$;

-- ================================================
-- RLS
--   注意: 見積画面は現状ログインを必要としないため、
--         既存の estimates と同じくanonからのアクセスを許可している。
--         スタッフ認証の導入時に estimates とあわせて見直すこと。
-- ================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers read for all" ON customers;
CREATE POLICY "customers read for all" ON customers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "customers insert for all" ON customers;
CREATE POLICY "customers insert for all" ON customers
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "customers update for all" ON customers;
CREATE POLICY "customers update for all" ON customers
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers delete for staff" ON customers;
CREATE POLICY "customers delete for staff" ON customers
    FOR DELETE TO authenticated USING (true);

-- 既存の estimates は insert/select のみ許可されているため、
-- 顧客の紐付け直しができるよう update を追加する。
DROP POLICY IF EXISTS "Enable update for all users" ON estimates;
CREATE POLICY "Enable update for all users" ON estimates
    FOR UPDATE USING (true) WITH CHECK (true);
