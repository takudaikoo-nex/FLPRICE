-- ================================================
-- 商品マスタ（要件: docs/requirements-product-catalog.md）
--
--   ・BC-21 などの商品を1か所で管理し、どのアイテム・どのプランから参照しても
--     画像・説明・商品名が連動するようにする
--   ・選択肢（items.options）は catalog_products.code を参照するだけにする
--   ・価格とプラン別価格・対象プランは今までどおり選択肢側に持つ
--     （同じ BC-21 でも1日葬と2日葬で金額が違うため）
--
--   このファイルは繰り返し実行しても安全（既存の商品は上書きしない）。
-- ================================================

CREATE TABLE IF NOT EXISTS catalog_products (
    code          text PRIMARY KEY,
    category      text NOT NULL DEFAULT 'OTHER'
                    CHECK (category IN ('ALTAR', 'AFTER', 'URN', 'URNCOVER',
                                        'FLOWER', 'PHOTO', 'COFFIN', 'OTHER')),
    name          text NOT NULL DEFAULT '',
    description   text NOT NULL DEFAULT '',
    image_paths   text[] NOT NULL DEFAULT '{}',
    display_order integer NOT NULL DEFAULT 0,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE catalog_products IS
    'オプション商品のマスタ。画像・説明・商品名の唯一の置き場所';
COMMENT ON COLUMN catalog_products.code IS
    '商品コード。既存の BC-xx / FO-xx / YW-x はそのまま使い、'
    '新規は分類ごとのプレフィックス+連番（UR-01 など）';
COMMENT ON COLUMN catalog_products.category IS
    'ALTAR=祭壇 / AFTER=後飾り祭壇 / URN=骨壺・骨箱 / URNCOVER=骨壺覆い / '
    'FLOWER=供花 / PHOTO=遺影の額 / COFFIN=お棺・仏衣 / OTHER=その他';
COMMENT ON COLUMN catalog_products.image_paths IS
    'Storage の item-images 内のパス。アイテム側の画像とバケットを共有する';

CREATE INDEX IF NOT EXISTS catalog_products_category_idx
    ON catalog_products (category, display_order);

-- ================================================
-- RLS
--   items と同じ扱い。個人情報を含まないため公開読み取り、書き込みはログイン済みのみ。
-- ================================================
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_products public read" ON catalog_products;
CREATE POLICY "catalog_products public read" ON catalog_products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "catalog_products staff all" ON catalog_products;
CREATE POLICY "catalog_products staff all" ON catalog_products
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_catalog_products_updated_at ON catalog_products;
CREATE TRIGGER update_catalog_products_updated_at BEFORE UPDATE ON catalog_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 移行1: 既存の選択肢名から商品コードを抽出してマスタを作る
--
--   'FO-01 (W1,800 カラー)' → code='FO-01', name='(W1,800 カラー)'
--   画像は、そのコードを持つ選択肢のうち画像が入っているものを優先して採用する。
--   分類は BC/FO=祭壇、YW=供花 のみ自動判定し、残りは「その他」に入れて
--   管理画面から当てはめてもらう。
-- ================================================
WITH extracted AS (
    SELECT
        substring(opt->>'name' FROM '^\s*([A-Z]{2}-[0-9]+)') AS code,
        btrim(regexp_replace(opt->>'name', '^\s*[A-Z]{2}-[0-9]+[\s　]*', '')) AS rest,
        ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(opt->'imagePaths', '[]'::jsonb))
        ) AS image_paths,
        COALESCE(i.display_order, 0) AS item_order,
        ord
    FROM items i,
         LATERAL jsonb_array_elements(i.options) WITH ORDINALITY AS t(opt, ord)
    WHERE jsonb_typeof(i.options) = 'array'
),
picked AS (
    SELECT DISTINCT ON (code)
        code,
        rest,
        image_paths,
        CASE
            WHEN code LIKE 'BC-%' OR code LIKE 'FO-%' THEN 'ALTAR'
            WHEN code LIKE 'YW-%'                     THEN 'FLOWER'
            ELSE 'OTHER'
        END AS category
    FROM extracted
    WHERE code IS NOT NULL
    -- 画像を持つ行を優先し、同点ならアイテムの並び順で最初のもの
    ORDER BY code, (cardinality(image_paths) > 0) DESC, item_order, ord
)
INSERT INTO catalog_products (code, category, name, description, image_paths, display_order)
SELECT
    code,
    category,
    CASE WHEN rest = '' THEN code ELSE rest END,
    '',
    image_paths,
    row_number() OVER (PARTITION BY category ORDER BY code)
FROM picked
ON CONFLICT (code) DO NOTHING;

-- ================================================
-- 移行2: 抽出できた選択肢に productCode を書き込む
--   コードが取れない選択肢（骨壺・遺影額など）はそのまま。
--   productCode が空の選択肢は従来どおり選択肢側の名前・画像で表示される。
-- ================================================
UPDATE items i
SET options = sub.new_options
FROM (
    SELECT
        i2.id,
        jsonb_agg(
            CASE
                WHEN substring(opt->>'name' FROM '^\s*([A-Z]{2}-[0-9]+)') IS NOT NULL
                    THEN opt || jsonb_build_object(
                        'productCode',
                        substring(opt->>'name' FROM '^\s*([A-Z]{2}-[0-9]+)')
                    )
                ELSE opt
            END
            ORDER BY ord
        ) AS new_options
    FROM items i2,
         LATERAL jsonb_array_elements(i2.options) WITH ORDINALITY AS t(opt, ord)
    WHERE jsonb_typeof(i2.options) = 'array'
      AND jsonb_array_length(i2.options) > 0
    GROUP BY i2.id
) sub
WHERE i.id = sub.id
  AND i.options IS DISTINCT FROM sub.new_options;

-- ================================================
-- 確認1: 同じコードなのに画像が食い違っていた選択肢
--   マスタには1つしか採用していないため、ここに出たものは目視で確認する。
-- ================================================
SELECT
    substring(opt->>'name' FROM '^\s*([A-Z]{2}-[0-9]+)') AS code,
    i.name  AS item_name,
    opt->>'name' AS option_name,
    COALESCE(jsonb_array_length(opt->'imagePaths'), 0) AS image_count
FROM items i,
     LATERAL jsonb_array_elements(i.options) WITH ORDINALITY AS t(opt, ord)
WHERE jsonb_typeof(i.options) = 'array'
  AND substring(opt->>'name' FROM '^\s*([A-Z]{2}-[0-9]+)') IN (
      SELECT substring(opt2->>'name' FROM '^\s*([A-Z]{2}-[0-9]+)')
      FROM items i2,
           LATERAL jsonb_array_elements(i2.options) AS t2(opt2)
      WHERE jsonb_typeof(i2.options) = 'array'
        AND substring(opt2->>'name' FROM '^\s*([A-Z]{2}-[0-9]+)') IS NOT NULL
        AND COALESCE(jsonb_array_length(opt2->'imagePaths'), 0) > 0
      GROUP BY 1
      HAVING count(DISTINCT opt2->'imagePaths') > 1
  )
ORDER BY code, i.display_order;

-- ================================================
-- 確認2: 商品コードが付かなかった選択肢（これから割り当てるもの）
-- ================================================
SELECT
    i.id    AS item_id,
    i.name  AS item_name,
    opt->>'name' AS option_name,
    COALESCE(jsonb_array_length(opt->'imagePaths'), 0) AS image_count
FROM items i,
     LATERAL jsonb_array_elements(i.options) WITH ORDINALITY AS t(opt, ord)
WHERE jsonb_typeof(i.options) = 'array'
  AND opt->>'productCode' IS NULL
ORDER BY i.display_order, ord;

-- ================================================
-- 確認3: 作成された商品マスタ
-- ================================================
SELECT category, count(*) AS products, sum(cardinality(image_paths)) AS images
FROM catalog_products
GROUP BY category
ORDER BY category;
