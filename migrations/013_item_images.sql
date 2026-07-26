-- ================================================
-- オプション画像
--
--   ・アイテム本体の画像を items.image_paths に持たせる
--   ・グレード（ドロップダウンの選択肢）の画像は items.options（JSONB）の
--     imagePaths に持たせるため、スキーマ変更は不要
-- ================================================

ALTER TABLE items
    ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}';

-- ================================================
-- Storage: アイテム画像用のバケット
-- ================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "item images public read" ON storage.objects;
CREATE POLICY "item images public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "item images staff write" ON storage.objects;
CREATE POLICY "item images staff write" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'item-images');

DROP POLICY IF EXISTS "item images staff update" ON storage.objects;
CREATE POLICY "item images staff update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "item images staff delete" ON storage.objects;
CREATE POLICY "item images staff delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'item-images');
