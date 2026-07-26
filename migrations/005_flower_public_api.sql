-- ================================================
-- 供花発注システム - 公開サイト用API (P2)
--
-- 方針: 公開サイト(anon)には funerals / flower_orders への直接アクセスを与えず、
--       SECURITY DEFINER 関数経由でのみ読み書きさせる。
--       金額は必ずこの関数内で再計算し、クライアントから送られた金額は信用しない。
-- ================================================

-- カード決済の有効フラグ（Stripe接続が済むまでは false）
ALTER TABLE flower_settings
    ADD COLUMN IF NOT EXISTS card_payment_enabled boolean NOT NULL DEFAULT false;

-- ================================================
-- 発注URLのトークンから、公開してよい葬儀情報のみを返す
-- ================================================
CREATE OR REPLACE FUNCTION funeral_public_lookup(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_funeral  funerals%ROWTYPE;
    v_settings flower_settings%ROWTYPE;
    v_status   text;
BEGIN
    SELECT * INTO v_funeral FROM funerals WHERE public_token = p_token;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found');
    END IF;

    SELECT * INTO v_settings FROM flower_settings WHERE id = 1;

    IF NOT v_funeral.is_order_open THEN
        v_status := 'closed';
    ELSIF v_funeral.order_deadline IS NOT NULL AND now() > v_funeral.order_deadline THEN
        v_status := 'deadline_passed';
    ELSE
        v_status := 'open';
    END IF;

    RETURN jsonb_build_object(
        'status',               v_status,
        'deceased_name',        v_funeral.deceased_name,
        'chief_mourner_name',   v_funeral.chief_mourner_name,
        'venue_name',           v_funeral.venue_name,
        'venue_address',        v_funeral.venue_address,
        'wake_at',              v_funeral.wake_at,
        'ceremony_at',          v_funeral.ceremony_at,
        'order_deadline',       v_funeral.order_deadline,
        'tax_rate',             COALESCE(v_settings.tax_rate, 0.10),
        'card_payment_enabled', COALESCE(v_settings.card_payment_enabled, false)
    );
END;
$$;

-- ================================================
-- 発注の作成
--   p_items: [{ "product_id": uuid, "quantity": int, "nafuda_name": text }, ...]
-- ================================================
CREATE OR REPLACE FUNCTION create_flower_order(
    p_token          text,
    p_orderer        jsonb,
    p_items          jsonb,
    p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_funeral   funerals%ROWTYPE;
    v_settings  flower_settings%ROWTYPE;
    v_item      jsonb;
    v_product   flower_products%ROWTYPE;
    v_quantity  integer;
    v_subtotal  integer := 0;
    v_tax       integer;
    v_order_id  bigint;
    v_order_no  text;
BEGIN
    -- 葬儀の特定と受付可否
    SELECT * INTO v_funeral FROM funerals WHERE public_token = p_token;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_TOKEN';
    END IF;

    IF NOT v_funeral.is_order_open THEN
        RAISE EXCEPTION 'ORDER_CLOSED';
    END IF;

    IF v_funeral.order_deadline IS NOT NULL AND now() > v_funeral.order_deadline THEN
        RAISE EXCEPTION 'DEADLINE_PASSED';
    END IF;

    SELECT * INTO v_settings FROM flower_settings WHERE id = 1;

    -- 支払い方法
    IF p_payment_method NOT IN ('card', 'invoice') THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
    END IF;

    IF p_payment_method = 'card' AND NOT COALESCE(v_settings.card_payment_enabled, false) THEN
        RAISE EXCEPTION 'CARD_DISABLED';
    END IF;

    -- 申込者の必須項目
    IF COALESCE(btrim(p_orderer->>'name'), '')  = ''
       OR COALESCE(btrim(p_orderer->>'phone'), '') = ''
       OR COALESCE(btrim(p_orderer->>'email'), '') = '' THEN
        RAISE EXCEPTION 'INVALID_ORDERER';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_ITEMS';
    END IF;

    -- 注文レコード（金額は後で更新）
    INSERT INTO flower_orders (
        funeral_id, orderer_name, orderer_kana, orderer_company,
        orderer_phone, orderer_email, orderer_postal_code, orderer_address,
        relation, payment_method, subtotal, tax, total, remarks
    ) VALUES (
        v_funeral.id,
        btrim(p_orderer->>'name'),
        COALESCE(p_orderer->>'kana', ''),
        COALESCE(p_orderer->>'company', ''),
        btrim(p_orderer->>'phone'),
        btrim(p_orderer->>'email'),
        COALESCE(p_orderer->>'postal_code', ''),
        COALESCE(p_orderer->>'address', ''),
        COALESCE(p_orderer->>'relation', ''),
        p_payment_method,
        0, 0, 0,
        COALESCE(p_orderer->>'remarks', '')
    )
    RETURNING id, order_number INTO v_order_id, v_order_no;

    -- 明細（価格はマスタから引き直す）
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_quantity := COALESCE((v_item->>'quantity')::integer, 0);
        IF v_quantity < 1 OR v_quantity > 20 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY';
        END IF;

        SELECT * INTO v_product
        FROM flower_products
        WHERE id = (v_item->>'product_id')::uuid AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
        END IF;

        INSERT INTO flower_order_items (
            order_id, product_id, product_code, product_name,
            unit_price, tax_rate, quantity, nafuda_name
        ) VALUES (
            v_order_id, v_product.id, v_product.code, v_product.name,
            v_product.price, COALESCE(v_settings.tax_rate, 0.10), v_quantity,
            COALESCE(btrim(v_item->>'nafuda_name'), '')
        );

        v_subtotal := v_subtotal + v_product.price * v_quantity;
    END LOOP;

    v_tax := round(v_subtotal * COALESCE(v_settings.tax_rate, 0.10));

    UPDATE flower_orders
    SET subtotal = v_subtotal,
        tax      = v_tax,
        total    = v_subtotal + v_tax
    WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'order_number', v_order_no,
        'subtotal',     v_subtotal,
        'tax',          v_tax,
        'total',        v_subtotal + v_tax
    );
END;
$$;

-- ================================================
-- 公開サイト(anon)に実行権限を付与
-- ================================================
REVOKE ALL ON FUNCTION funeral_public_lookup(text) FROM public;
REVOKE ALL ON FUNCTION create_flower_order(text, jsonb, jsonb, text) FROM public;

GRANT EXECUTE ON FUNCTION funeral_public_lookup(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_flower_order(text, jsonb, jsonb, text) TO anon, authenticated;
