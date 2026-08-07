import { supabase } from './supabase';

// ================================================
// 喪主用ログイン情報（案件ごとのID／パスワード）
//   ハッシュ化と照合はDB側の関数で行う（migrations/020_case_credentials_functions.sql）。
//   この画面はハッシュを一切扱わない。
// ================================================

export interface CaseCredential {
    estimate_id: number;
    login_id: string;
    is_active: boolean;
    expires_at: string | null;
    issued_at: string;
    issued_by: string;
    last_login_at: string | null;
}

export interface IssuedCredential {
    loginId: string;
    /** 平文はここでしか手に入らない。閉じたら二度と表示できない */
    password: string;
}

/** 見間違えやすい文字（0/O・1/I/l）を除いた英数字 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomString = (length: number): string => {
    const bytes = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
};

export const buildLoginId = (estimateId: number): string => `FL-${estimateId}-${randomString(4)}`;

export const buildPassword = (): string => randomString(8);

export const fetchCredential = async (estimateId: number): Promise<CaseCredential | null> => {
    const { data, error } = await supabase
        .from('case_credentials')
        .select('estimate_id, login_id, is_active, expires_at, issued_at, issued_by, last_login_at')
        .eq('estimate_id', estimateId)
        .maybeSingle();

    if (error) throw error;
    return (data as CaseCredential) ?? null;
};

/**
 * 発行（再発行も同じ）。
 * 再発行すると旧パスワードは無効になり、開いたままの画面も切れる。
 */
export const issueCredential = async (
    estimateId: number, issuedBy: string,
): Promise<IssuedCredential> => {
    const loginId = buildLoginId(estimateId);
    const password = buildPassword();

    const { error } = await supabase.rpc('issue_case_credential', {
        p_estimate_id: estimateId,
        p_login_id: loginId,
        p_password: password,
        p_issued_by: issuedBy,
    });

    if (error) throw error;
    return { loginId, password };
};

export const setCredentialActive = async (estimateId: number, active: boolean): Promise<void> => {
    const { error } = await supabase.rpc('deactivate_case_credential', {
        p_estimate_id: estimateId,
        p_active: active,
    });
    if (error) throw error;
};

/** 喪主サイトのベースURL（管理画面で設定） */
export const fetchTaskSiteBaseUrl = async (): Promise<string> => {
    const { data, error } = await supabase
        .from('flower_settings')
        .select('task_site_base_url')
        .eq('id', 1)
        .single();

    if (error) throw error;
    return (data?.task_site_base_url || '').replace(/\/+$/, '');
};

export const saveTaskSiteBaseUrl = async (url: string): Promise<void> => {
    const { error } = await supabase
        .from('flower_settings')
        .update({ task_site_base_url: url.replace(/\/+$/, '') })
        .eq('id', 1);
    if (error) throw error;
};

/** 喪主に渡す3行（URL / ID / パスワード） */
export const buildCredentialText = (
    baseUrl: string, loginId: string, password: string,
): string => [
    `URL: ${baseUrl || '（未設定）'}`,
    `ID: ${loginId}`,
    `パスワード: ${password}`,
].join('\n');
