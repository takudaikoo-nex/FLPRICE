-- ================================================
-- ログインIDの照合を大文字小文字の区別なしにする
--
--   IDは「案件番号 + ランダム4文字」（例: 462-4k7q）に変更した。
--   スマホの自動大文字化や、紙に控えた字の書き写しで
--   大小がずれてもログインできるようにする。
--
--   ※ 発行するIDは常に小文字。この関数は受け取り側を緩めるだけ。
--
--   前提: migrations/021_fix_credential_functions.sql
-- ================================================

CREATE OR REPLACE FUNCTION case_login(
    p_login_id text,
    p_password text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_estimate_id bigint;
BEGIN
    SELECT estimate_id INTO v_estimate_id
    FROM case_credentials
    WHERE lower(btrim(login_id)) = lower(btrim(p_login_id))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND password_hash = crypt(p_password, password_hash);

    IF v_estimate_id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE case_credentials SET last_login_at = now() WHERE estimate_id = v_estimate_id;
    RETURN v_estimate_id;
END;
$$;

REVOKE ALL ON FUNCTION case_login(text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION case_login(text, text) TO service_role;

-- 大小違いの重複を防ぐ（発行は小文字のみだが、念のため）
CREATE UNIQUE INDEX IF NOT EXISTS case_credentials_login_id_lower_idx
    ON case_credentials (lower(login_id));

NOTIFY pgrst, 'reload schema';

-- ================================================
-- 確認用
-- ================================================
SELECT
    p.proname,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
    has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon,
    has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'case_login';
