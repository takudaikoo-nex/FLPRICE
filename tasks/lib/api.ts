// ================================================
// タスク進捗（喪主）サイトの API クライアント
//
// このサイトには Supabase の鍵を持たせない。
// DBへのアクセスはすべて Edge Function（task-public）が行い、
// ここからは認証情報なしの fetch で呼び出す。
// ================================================

const FUNCTION_URL = 'https://kbifluukpqhbjmhhvbgg.supabase.co/functions/v1/task-public';

const TOKEN_KEY = 'fl_task_token';

export type Role = 'mourner' | 'staff';
export type TaskPhase = 'meeting' | 'prepare' | 'day' | 'payment' | 'after';
export type TaskOwner = 'fl' | 'mourner' | 'both';
export type TaskStatus = 'todo' | 'doing' | 'done' | 'skipped';

export const PHASE_LABEL: Record<TaskPhase, string> = {
    meeting: 'お打ち合わせ',
    prepare: 'ご準備',
    day: '当日',
    payment: 'お支払い',
    after: 'これからのお手続き',
};

export const PHASE_ORDER: TaskPhase[] = ['meeting', 'prepare', 'day', 'payment', 'after'];

export interface CaseSummary {
    estimate_id: number;
    deceased_name: string;
    chief_mourner_name: string;
    funeral_date: string;
    venue_name: string;
    venue_address: string;
    status: string;
}

export interface PublicTask {
    id: number;
    code: string;
    title: string;
    description: string;
    phase: TaskPhase;
    owner: TaskOwner;
    status: TaskStatus;
    due_at: string | null;
    shared_note: string;
    mourner_confirmed_at: string | null;
    completed_at: string | null;
    related_item_id: number | null;
    sort_order: number;
    /** スタッフのレスポンスにだけ含まれる */
    assignee_name?: string;
    staff_note?: string;
    visible_to_mourner?: boolean;
}

export interface StaffCase {
    estimate_id: number;
    deceased_name: string;
    chief_mourner_name: string;
    funeral_date: string;
    venue_name: string;
    status: string;
}

export interface Billing {
    total: number;
    lines: { name: string; amount: number }[];
    bank_info: string;
    invoice_issued_at: string | null;
    receipt_issued_at: string | null;
    due_date: string | null;
}

export interface LoginResult {
    token: string;
    role: Role;
    expires_at: string;
    case: CaseSummary | null;
}

class ApiError extends Error {}

const callApi = async <T>(body: Record<string, unknown>): Promise<T> => {
    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.error) {
        throw new ApiError(data?.error || `HTTP ${response.status}`);
    }
    return data as T;
};

// ---- トークンの保管 ----
export const readToken = (): string | null => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const saveToken = (token: string) => {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        // プライベートブラウジングなどで保存できない場合は、その場限りの利用になる
    }
};

export const clearToken = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        // 何もしない
    }
};

// ---- API ----
export const login = (loginId: string, password: string): Promise<LoginResult> =>
    callApi<LoginResult>({ action: 'login', login_id: loginId, password });

export const restoreSession = (token: string) =>
    callApi<{ role: Role; expires_at: string; case: CaseSummary | null }>({ action: 'session', token });

export const fetchTasks = (token: string, estimateId?: number) =>
    callApi<{ case: CaseSummary | null; tasks: PublicTask[] }>({
        action: 'tasks', token, estimate_id: estimateId,
    });

export const fetchCases = (token: string) =>
    callApi<StaffCase[]>({ action: 'cases', token });

export const fetchBilling = (token: string, estimateId?: number) =>
    callApi<Billing | null>({ action: 'billing', token, estimate_id: estimateId });

export const setConfirmed = (token: string, taskId: number, confirmed: boolean) =>
    callApi<{ ok: true }>({ action: 'update_task', token, task_id: taskId, confirmed });

export const setStatus = (token: string, taskId: number, status: TaskStatus) =>
    callApi<{ ok: true }>({ action: 'update_task', token, task_id: taskId, status });

export const logout = (token: string) =>
    callApi<{ ok: true }>({ action: 'logout', token });

// ---- 表示用 ----
const ERROR_MESSAGES: Record<string, string> = {
    INVALID_LOGIN: 'IDまたはパスワードが正しくありません。',
    INVALID_SESSION: '接続の有効期限が切れました。もう一度ログインしてください。',
    FORBIDDEN: 'この操作は行えません。',
    NO_CASE: '案件が選択されていません。',
    TASK_NOT_FOUND: '項目が見つかりませんでした。',
};

export const toUserMessage = (error: unknown): string => {
    const raw = (error as { message?: string })?.message ?? '';
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
        if (raw.includes(code)) return message;
    }
    return '通信に失敗しました。電波状況をご確認のうえ、もう一度お試しください。';
};

export const formatYen = (value: number): string => `¥${(value ?? 0).toLocaleString()}`;

export const formatDue = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const formatDate = (value: string | null): string => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

export const isOverdue = (task: PublicTask): boolean =>
    task.status !== 'done' && task.status !== 'skipped'
    && !!task.due_at && new Date(task.due_at).getTime() < Date.now();

/** 喪主が自分でチェックできるタスクか */
export const isMourneryTask = (task: PublicTask): boolean =>
    task.owner === 'mourner' || task.owner === 'both';
