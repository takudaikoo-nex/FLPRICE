-- ================================================
-- 020 の修正
--
--   1. crypt() / gen_salt() が見つからない問題
--      Supabase では pgcrypto が public ではなく extensions スキーマに入る。
--      020 で search_path を「public, pg_temp」に固定したため、
--      発行時に function crypt(text, text) does not exist で失敗していた。
--      → search_path に extensions を足す。
--
--   2. anon から実行できてしまう問題
--      Supabase は新しく作った関数に対して anon / authenticated へ
--      自動で EXECUTE を付ける（ALTER DEFAULT PRIVILEGES）。
--      020 の REVOKE ... FROM public では、この直接の GRANT は外れない。
--      → anon から明示的に剥奪する。
--
--      issue_case_credential が anon から呼べる状態は、
--      anon キーを取り出せる人が任意の案件のログイン情報を発行でき、
--      喪主として案件を閲覧できてしまうため実害がある。
--
--   前提: migrations/020_case_credentials_functions.sql
-- ================================================

-- ================================================
-- 1. search_path の修正（関数の中身は 020 と同じ）
-- ================================================

CREATE OR REPLACE FUNCTION issue_case_credential(
    p_estimate_id bigint,
    p_login_id    text,
    p_password    text,
    p_issued_by   text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_login_id text := btrim(p_login_id);
BEGIN
    IF v_login_id = '' OR length(p_password) < 8 THEN
        RAISE EXCEPTION 'INVALID_CREDENTIAL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM estimates WHERE id = p_estimate_id) THEN
        RAISE EXCEPTION 'ESTIMATE_NOT_FOUND';
    END IF;

    INSERT INTO case_credentials (estimate_id, login_id, password_hash, issued_by, is_active)
    VALUES (p_estimate_id, v_login_id, crypt(p_password, gen_salt('bf')), p_issued_by, true)
    ON CONFLICT (estimate_id) DO UPDATE
        SET login_id      = EXCLUDED.login_id,
            password_hash = EXCLUDED.password_hash,
            issued_by     = EXCLUDED.issued_by,
            issued_at     = now(),
            is_active     = true,
            last_login_at = NULL;

    DELETE FROM case_sessions WHERE estimate_id = p_estimate_id;

    RETURN jsonb_build_object('login_id', v_login_id);
END;
$$;

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
    WHERE login_id = btrim(p_login_id)
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

-- ================================================
-- 2. 実行権限の締め直し
--    anon には一切与えない。
-- ================================================

REVOKE ALL ON FUNCTION issue_case_credential(bigint, text, text, text) FROM anon, public;
REVOKE ALL ON FUNCTION deactivate_case_credential(bigint, boolean)     FROM anon, public;
REVOKE ALL ON FUNCTION case_login(text, text)                          FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION purge_expired_case_sessions()                   FROM anon, authenticated, public;

-- 発行・停止は見積システム（ログイン済み）のみ
GRANT EXECUTE ON FUNCTION issue_case_credential(bigint, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_case_credential(bigint, boolean)     TO authenticated;

-- 照合とセッションの掃除は Edge Function（service_role）のみ
GRANT EXECUTE ON FUNCTION case_login(text, text)         TO service_role;
GRANT EXECUTE ON FUNCTION purge_expired_case_sessions()  TO service_role;

-- PostgREST に定義の変更を知らせる
NOTIFY pgrst, 'reload schema';

-- ================================================
-- 確認用
--   期待する結果
--     issue_case_credential      … authenticated: true  / anon: false
--     deactivate_case_credential … authenticated: true  / anon: false
--     case_login                 … authenticated: false / anon: false
--     purge_expired_case_sessions… authenticated: false / anon: false
-- ================================================
SELECT
    p.proname,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
    has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon,
    has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role,
    array_to_string(p.proconfig, ', ') AS settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('issue_case_credential', 'deactivate_case_credential',
                    'case_login', 'purge_expired_case_sessions')
ORDER BY p.proname;

-- pgcrypto がどこに入っているかの確認（extensions が通常）
SELECT e.extname, n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname = 'pgcrypto';
