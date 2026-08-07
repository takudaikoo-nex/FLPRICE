-- ================================================
-- 喪主用ログイン情報の発行と照合
--
--   パスワードのハッシュ化・照合は pgcrypto の crypt() で行う。
--   ブラウザからも Edge Function からも直接 SQL を書けないため、
--   SECURITY DEFINER の関数として用意し、実行権限を絞る。
--
--     issue_case_credential      … 見積システム（authenticated）から発行する
--     deactivate_case_credential … 発行済みの停止
--     case_login                 … Edge Function（service_role）からの照合
--
--   前提: migrations/019_case_tasks.sql
-- ================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- 喪主サイトのベースURL
--   供花の site_base_url と同じ扱い。設定は単一行の flower_settings に置く。
-- ================================================
ALTER TABLE flower_settings
    ADD COLUMN IF NOT EXISTS task_site_base_url text NOT NULL DEFAULT '';

COMMENT ON COLUMN flower_settings.task_site_base_url IS
    'タスク進捗（喪主）サイトのベースURL。案件画面でログイン情報をコピーするときに使う';

-- ================================================
-- 発行（再発行も同じ関数）
--   平文のパスワードは保存せず、ハッシュだけを持つ。
--   再発行したら既存のセッションは無効にする。
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
SET search_path = public, pg_temp
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

    -- 旧パスワードで開かれたままの画面を切る
    DELETE FROM case_sessions WHERE estimate_id = p_estimate_id;

    RETURN jsonb_build_object('login_id', v_login_id);
END;
$$;

-- ================================================
-- 停止 / 再開
-- ================================================
CREATE OR REPLACE FUNCTION deactivate_case_credential(
    p_estimate_id bigint,
    p_active      boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE case_credentials SET is_active = p_active WHERE estimate_id = p_estimate_id;

    IF NOT p_active THEN
        DELETE FROM case_sessions WHERE estimate_id = p_estimate_id;
    END IF;
END;
$$;

-- ================================================
-- 照合（Edge Function からのみ）
--   一致しなければ NULL を返す。理由は返さない。
-- ================================================
CREATE OR REPLACE FUNCTION case_login(
    p_login_id text,
    p_password text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
-- 実行権限
-- ================================================
REVOKE ALL ON FUNCTION issue_case_credential(bigint, text, text, text) FROM public;
REVOKE ALL ON FUNCTION deactivate_case_credential(bigint, boolean)     FROM public;
REVOKE ALL ON FUNCTION case_login(text, text)                          FROM public;

-- 発行・停止は見積システム（ログイン済み）から
GRANT EXECUTE ON FUNCTION issue_case_credential(bigint, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_case_credential(bigint, boolean)     TO authenticated;

-- 照合は Edge Function（service_role）からのみ。anon には与えない。
GRANT EXECUTE ON FUNCTION case_login(text, text) TO service_role;

-- ================================================
-- 期限切れセッションの掃除
--   Edge Function から呼ぶ（cron が無くても溜まり続けないように）
-- ================================================
CREATE OR REPLACE FUNCTION purge_expired_case_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    DELETE FROM case_sessions WHERE expires_at < now();
$$;

REVOKE ALL ON FUNCTION purge_expired_case_sessions() FROM public;
GRANT EXECUTE ON FUNCTION purge_expired_case_sessions() TO service_role;

-- ================================================
-- 確認用
-- ================================================
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       array_agg(a.rolname ORDER BY a.rolname) AS granted_to
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN LATERAL (
    SELECT r.rolname FROM pg_roles r
    WHERE has_function_privilege(r.rolname, p.oid, 'EXECUTE')
      AND r.rolname IN ('anon', 'authenticated', 'service_role')
) a ON true
WHERE n.nspname = 'public'
  AND p.proname IN ('issue_case_credential', 'deactivate_case_credential',
                    'case_login', 'purge_expired_case_sessions')
GROUP BY p.proname, args
ORDER BY p.proname;
