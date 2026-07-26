-- ================================================
-- 供花発注システム - 発注URL発行時の割引
--
--   葬儀（発注URL）ごとに割引を設定し、そのURLから入った注文に適用する。
--   割引は税抜の小計に対してかけ、消費税は割引後の金額に対して計算する。
-- ================================================

ALTER TABLE funerals
    ADD COLUMN IF NOT EXISTS discount_type  text NOT NULL DEFAULT 'none'
        CHECK (discount_type IN ('none', 'amount', 'percent')),
    ADD COLUMN IF NOT EXISTS discount_value integer NOT NULL DEFAULT 0
        CHECK (discount_value >= 0),
    ADD COLUMN IF NOT EXISTS discount_note  text NOT NULL DEFAULT '';

ALTER TABLE flower_orders
    ADD COLUMN IF NOT EXISTS discount integer NOT NULL DEFAULT 0;  -- 適用された割引額（税抜）

-- ================================================
-- 公開サイト用API の更新（割引に対応）
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
        'discount_type',        v_funeral.discount_type,
        'discount_value',       v_funeral.discount_value,
        'discount_note',        v_funeral.discount_note,
        'tax_rate',             COALESCE(v_settings.tax_rate, 0.10),
        'card_payment_enabled', COALESCE(v_settings.card_payment_enabled, false)
    );
END;
$$;

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
    v_discount  integer := 0;
    v_taxable   integer;
    v_tax       integer;
    v_order_id  bigint;
    v_order_no  text;
BEGIN
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

    IF p_payment_method NOT IN ('card', 'invoice') THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
    END IF;

    IF p_payment_method = 'card' AND NOT COALESCE(v_settings.card_payment_enabled, false) THEN
        RAISE EXCEPTION 'CARD_DISABLED';
    END IF;

    IF COALESCE(btrim(p_orderer->>'name'), '')  = ''
       OR COALESCE(btrim(p_orderer->>'phone'), '') = ''
       OR COALESCE(btrim(p_orderer->>'email'), '') = '' THEN
        RAISE EXCEPTION 'INVALID_ORDERER';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_ITEMS';
    END IF;

    INSERT INTO flower_orders (
        funeral_id, orderer_name, orderer_kana, orderer_company,
        orderer_phone, orderer_email, orderer_postal_code, orderer_address,
        relation, payment_method, subtotal, discount, tax, total, remarks
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
        0, 0, 0, 0,
        COALESCE(p_orderer->>'remarks', '')
    )
    RETURNING id, order_number INTO v_order_id, v_order_no;

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

    -- 割引（税抜の小計に対して適用。小計を超えないよう丸める）
    IF v_funeral.discount_type = 'amount' THEN
        v_discount := LEAST(v_funeral.discount_value, v_subtotal);
    ELSIF v_funeral.discount_type = 'percent' THEN
        v_discount := LEAST(round(v_subtotal * v_funeral.discount_value / 100.0), v_subtotal);
    END IF;

    v_taxable := v_subtotal - v_discount;
    v_tax     := round(v_taxable * COALESCE(v_settings.tax_rate, 0.10));

    UPDATE flower_orders
    SET subtotal = v_subtotal,
        discount = v_discount,
        tax      = v_tax,
        total    = v_taxable + v_tax
    WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'order_number', v_order_no,
        'subtotal',     v_subtotal,
        'discount',     v_discount,
        'tax',          v_tax,
        'total',        v_taxable + v_tax
    );
END;
$$;

REVOKE ALL ON FUNCTION funeral_public_lookup(text) FROM public;
REVOKE ALL ON FUNCTION create_flower_order(text, jsonb, jsonb, text) FROM public;

GRANT EXECUTE ON FUNCTION funeral_public_lookup(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_flower_order(text, jsonb, jsonb, text) TO anon, authenticated;
