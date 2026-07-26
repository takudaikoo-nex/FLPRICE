-- ================================================
-- 案件（見積）のステータス管理と帳票の発行履歴
--
--   ・estimates を「案件」として扱い、ステータスで進捗を管理する
--   ・見積書 / 請求書 / 領収書の発行日時を記録する
--   ・案件ごとのメモを持たせる
-- ================================================

ALTER TABLE estimates
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'quoted'
        CHECK (status IN ('quoted', 'ordered', 'completed', 'invoiced', 'paid', 'cancelled')),
    ADD COLUMN IF NOT EXISTS quote_issued_at   timestamptz,
    ADD COLUMN IF NOT EXISTS invoice_issued_at timestamptz,
    ADD COLUMN IF NOT EXISTS receipt_issued_at timestamptz,
    ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS estimates_status_idx ON estimates (status);

-- ---- 既存データ: 作成日時を見積書の発行日時として扱う ----
UPDATE estimates
SET quote_issued_at = created_at
WHERE quote_issued_at IS NULL;

-- ---- 更新日時 ----
ALTER TABLE estimates
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ステータスの意味
--   quoted    見積提示   … 見積書を作成した段階
--   ordered   受注       … 依頼が確定した段階
--   completed 施行済     … 葬儀が終わった段階
--   invoiced  請求済     … 請求書を発行した段階
--   paid      入金済     … 領収書を発行／入金を確認した段階
--   cancelled キャンセル
-- ================================================
