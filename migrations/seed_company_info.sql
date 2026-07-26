-- ================================================
-- 事業者情報の登録
--
--   供花サイトの特定商取引法に基づく表記・プライバシーポリシー・フッター、
--   および請求書メールの差出人欄に使われる。
-- ================================================

UPDATE flower_settings
SET company_name        = 'ファーストリーフ',
    company_address     = '神奈川県茅ヶ崎市矢畑682-10',
    company_tel         = '0467-38-5617',
    contact_tel         = '0467-38-5617',
    representative_name = '大石 康太',
    mail_from           = 'kota_oishi@first-leaf.jp',
    mail_from_name      = 'ファーストリーフ'
WHERE id = 1;

-- 確認
SELECT company_name, company_postal_code, company_address, company_tel,
       representative_name, contact_tel, contact_hours, mail_from
FROM flower_settings WHERE id = 1;
