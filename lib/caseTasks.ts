import { supabase } from './supabase';
import { Item } from '../types';
import { funeralDateToCeremonyIso } from './estimateQueries';

// ================================================
// 案件ごとのタスク進捗
//   要件: docs/requirements-task-progress.md
//   スキーマ: migrations/019_case_tasks.sql
// ================================================

export type TaskPhase = 'meeting' | 'prepare' | 'day' | 'payment' | 'after';
export type TaskOwner = 'fl' | 'mourner' | 'both';
export type TaskStatus = 'todo' | 'doing' | 'done' | 'skipped';
export type DocumentType = 'quote' | 'invoice' | 'receipt';

export const PHASE_LABEL: Record<TaskPhase, string> = {
    meeting: '打ち合わせ',
    prepare: '準備',
    day: '当日',
    payment: 'お支払い',
    after: '葬儀後',
};

export const PHASE_ORDER: TaskPhase[] = ['meeting', 'prepare', 'day', 'payment', 'after'];

export const OWNER_LABEL: Record<TaskOwner, string> = {
    fl: 'FL',
    mourner: '喪主',
    both: 'FL・喪主',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
    todo: '未着手',
    doing: '対応中',
    done: '完了',
    skipped: '対象外',
};

export interface CaseTaskTemplate {
    id: string;
    code: string;
    title: string;
    description: string;
    phase: TaskPhase;
    owner: TaskOwner;
    visible_to_mourner: boolean;
    target_categories: string[];
    target_plan_ids: string[];
    related_item_id: number | null;
    require_flower: boolean;
    due_offset_days: number | null;
    auto_complete_on: DocumentType | null;
    initial_status: 'todo' | 'done';
    sort_order: number;
    is_active: boolean;
}

export interface CaseTask {
    id: number;
    estimate_id: number;
    template_id: string | null;
    code: string;
    title: string;
    description: string;
    phase: TaskPhase;
    owner: TaskOwner;
    visible_to_mourner: boolean;
    related_item_id: number | null;
    status: TaskStatus;
    due_at: string | null;
    assignee_name: string;
    staff_note: string;
    shared_note: string;
    mourner_confirmed_at: string | null;
    completed_at: string | null;
    completed_by_role: 'staff' | 'system' | null;
    completed_by_name: string;
    auto_complete_on: DocumentType | null;
    sort_order: number;
    updated_at?: string;
}

export interface CaseTaskEvent {
    id: number;
    task_id: number;
    action: string;
    from_value: string | null;
    to_value: string | null;
    actor_role: 'staff' | 'mourner' | 'system';
    actor_name: string;
    created_at: string;
}

/** 案件一覧に出す進捗のまとめ */
export interface CaseProgress {
    total: number;
    done: number;
    /** 期日を過ぎた未完了 */
    overdue: number;
    /** 喪主が確認済みでFLが未確定 */
    awaitingConfirm: number;
    /** 次にFLが着手すべきタスク */
    nextTask: CaseTask | null;
}

export const EMPTY_PROGRESS: CaseProgress = {
    total: 0, done: 0, overdue: 0, awaitingConfirm: 0, nextTask: null,
};

// ================================================
// 取得
// ================================================

export const fetchTaskTemplates = async (activeOnly = false): Promise<CaseTaskTemplate[]> => {
    let query = supabase.from('case_task_templates').select('*').order('sort_order');
    if (activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CaseTaskTemplate[];
};

export const fetchCaseTasks = async (estimateId: number): Promise<CaseTask[]> => {
    const { data, error } = await supabase
        .from('case_tasks')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sort_order');

    if (error) throw error;
    return (data || []) as CaseTask[];
};

export const fetchTaskEvents = async (estimateId: number, limit = 30): Promise<CaseTaskEvent[]> => {
    const { data, error } = await supabase
        .from('case_task_events')
        .select('*, case_tasks!inner(estimate_id)')
        .eq('case_tasks.estimate_id', estimateId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data || []) as CaseTaskEvent[];
};

/** 複数案件のタスクをまとめて取り、案件ごとの進捗に畳む */
export const fetchProgressMap = async (estimateIds: number[]): Promise<Map<number, CaseProgress>> => {
    const result = new Map<number, CaseProgress>();
    if (estimateIds.length === 0) return result;

    const { data, error } = await supabase
        .from('case_tasks')
        .select('*')
        .in('estimate_id', estimateIds)
        .order('sort_order');

    if (error) throw error;

    for (const task of (data || []) as CaseTask[]) {
        const current = result.get(task.estimate_id) || { ...EMPTY_PROGRESS };
        result.set(task.estimate_id, mergeProgress(current, task));
    }
    return result;
};

const mergeProgress = (progress: CaseProgress, task: CaseTask): CaseProgress => {
    if (task.status === 'skipped') return progress;

    const next = { ...progress, total: progress.total + 1 };
    if (task.status === 'done') {
        next.done += 1;
        return next;
    }

    if (isOverdue(task)) next.overdue += 1;
    if (task.mourner_confirmed_at) next.awaitingConfirm += 1;
    // 未完了のうち、FLが動くもので最も上にあるものを「次の作業」とする
    if (!next.nextTask && task.owner !== 'mourner') next.nextTask = task;

    return next;
};

export const isOverdue = (task: CaseTask): boolean =>
    task.status !== 'done' && task.status !== 'skipped' &&
    !!task.due_at && new Date(task.due_at).getTime() < Date.now();

export const progressPercent = (progress: CaseProgress): number =>
    progress.total === 0 ? 0 : Math.round(progress.done / progress.total * 100);

// ================================================
// 生成
//   受注（quoted → ordered）のタイミング、または画面の「タスクを生成」から呼ぶ。
//   判定はプラン（カテゴリ／プランID）で行い、「オプションが選択済みか」は見ない。
//   選択済み＝もう決まっている＝タスク不要、という逆向きの条件になってしまうため。
// ================================================

const DAY_MS = 24 * 60 * 60 * 1000;

const dueFromCeremony = (ceremonyIso: string | null, offsetDays: number | null): string | null => {
    if (!ceremonyIso || offsetDays === null) return null;
    const base = new Date(ceremonyIso).getTime();
    if (isNaN(base)) return null;
    return new Date(base + offsetDays * DAY_MS).toISOString();
};

/**
 * そのテンプレートを、この案件で生成するか。
 *
 * related_item_id は「そのオプションがこのプランで選べるか」の判定にだけ使う。
 * 見積のスナップショットに該当アイテムが無い場合は判定できないため、生成する側に倒す。
 */
const shouldGenerate = (
    template: CaseTaskTemplate,
    context: { category: string; planId: string; items: Item[]; hasFlower: boolean },
): boolean => {
    const { category, planId, items, hasFlower } = context;

    if (template.target_categories.length > 0 && !template.target_categories.includes(category)) return false;
    if (template.target_plan_ids.length > 0 && !template.target_plan_ids.includes(planId)) return false;
    if (template.require_flower && !hasFlower) return false;

    if (template.related_item_id !== null && planId) {
        const item = items.find(i => i.id === template.related_item_id);
        if (item && !item.allowedPlans.includes(planId)) return false;
    }
    return true;
};

export interface GenerateResult {
    created: number;
    skipped: number;
}

/**
 * 案件のタスクを生成する。
 * すでにある code は作り直さない（UNIQUE (estimate_id, code)）ため、
 * 見積を直したあとに呼び直すと「増えた分だけ」追加される。
 * 条件から外れたタスクは自動では消さない（進行中の作業を消さないため）。
 */
export const generateCaseTasks = async (estimateId: number): Promise<GenerateResult> => {
    const [estimateResult, templates, existing, flowerResult] = await Promise.all([
        supabase.from('estimates').select('content, customer_info').eq('id', estimateId).single(),
        fetchTaskTemplates(true),
        fetchCaseTasks(estimateId),
        supabase.from('funerals').select('id').eq('estimate_id', estimateId).limit(1),
    ]);

    if (estimateResult.error) throw estimateResult.error;

    const content = estimateResult.data?.content || {};
    const customerInfo = estimateResult.data?.customer_info || {};
    const context = {
        category: content.plan?.category ?? '',
        planId: content.plan?.id ?? '',
        items: (content.items ?? []) as Item[],
        hasFlower: (flowerResult.data || []).length > 0,
    };

    const ceremonyIso = funeralDateToCeremonyIso(customerInfo.funeralDate || '');
    const existingCodes = new Set(existing.map(task => task.code));

    const targets = templates.filter(t => shouldGenerate(t, context));
    const rows = targets
        .filter(t => !existingCodes.has(t.code))
        .map(t => ({
            estimate_id: estimateId,
            template_id: t.id,
            code: t.code,
            title: t.title,
            description: t.description,
            phase: t.phase,
            owner: t.owner,
            visible_to_mourner: t.visible_to_mourner,
            related_item_id: t.related_item_id,
            status: t.initial_status,
            due_at: dueFromCeremony(ceremonyIso, t.due_offset_days),
            auto_complete_on: t.auto_complete_on,
            sort_order: t.sort_order,
            completed_at: t.initial_status === 'done' ? new Date().toISOString() : null,
            completed_by_role: t.initial_status === 'done' ? 'system' : null,
        }));

    if (rows.length > 0) {
        const { error } = await supabase.from('case_tasks').insert(rows);
        if (error) throw error;
    }

    return { created: rows.length, skipped: targets.length - rows.length };
};

// ================================================
// 更新
// ================================================

interface TaskPatch {
    status?: TaskStatus;
    due_at?: string | null;
    assignee_name?: string;
    staff_note?: string;
    shared_note?: string;
    visible_to_mourner?: boolean;
}

const logEvent = async (
    taskId: number, action: string, from: string | null, to: string | null, actorName: string,
) => {
    // 履歴の記録に失敗しても本体の更新は成立しているため、ログに残して続行する
    const { error } = await supabase.from('case_task_events').insert([{
        task_id: taskId,
        action,
        from_value: from,
        to_value: to,
        actor_role: 'staff',
        actor_name: actorName,
    }]);
    if (error) console.error('Failed to log task event:', error);
};

export const updateCaseTask = async (
    task: CaseTask, patch: TaskPatch, actorName: string,
): Promise<void> => {
    const payload: Record<string, unknown> = { ...patch };

    if (patch.status && patch.status !== task.status) {
        const done = patch.status === 'done';
        payload.completed_at = done ? new Date().toISOString() : null;
        payload.completed_by_role = done ? 'staff' : null;
        payload.completed_by_name = done ? actorName : '';
    }

    const { error } = await supabase.from('case_tasks').update(payload).eq('id', task.id);
    if (error) throw error;

    if (patch.status && patch.status !== task.status) {
        await logEvent(task.id, 'status', task.status, patch.status, actorName);
    }
    if (patch.due_at !== undefined && patch.due_at !== task.due_at) {
        await logEvent(task.id, 'due', task.due_at, patch.due_at, actorName);
    }
    if (patch.assignee_name !== undefined && patch.assignee_name !== task.assignee_name) {
        await logEvent(task.id, 'assignee', task.assignee_name, patch.assignee_name, actorName);
    }
};

/**
 * 帳票の発行に連動してタスクを完了させる。
 *   請求書 → 「請求書の送付」
 *   領収書 → 「入金の確認」（＝ゴール）
 * 見積書の発行では進めない。
 */
export const completeTasksForDocument = async (
    estimateId: number, documentType: DocumentType,
): Promise<void> => {
    if (documentType === 'quote') return;

    const { data, error } = await supabase
        .from('case_tasks')
        .select('id, status')
        .eq('estimate_id', estimateId)
        .eq('auto_complete_on', documentType)
        .neq('status', 'done');

    if (error) throw error;

    const targets = (data || []) as { id: number; status: TaskStatus }[];
    if (targets.length === 0) return;

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
        .from('case_tasks')
        .update({
            status: 'done',
            completed_at: now,
            completed_by_role: 'system',
            completed_by_name: '帳票発行',
        })
        .in('id', targets.map(t => t.id));

    if (updateError) throw updateError;

    for (const target of targets) {
        const { error: eventError } = await supabase.from('case_task_events').insert([{
            task_id: target.id,
            action: 'status',
            from_value: target.status,
            to_value: 'done',
            actor_role: 'system',
            actor_name: documentType === 'invoice' ? '請求書の発行' : '領収書の発行',
        }]);
        if (eventError) console.error('Failed to log task event:', eventError);
    }
};

// ================================================
// 表示用
// ================================================

export const formatDueDate = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const formatDateTime = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** <input type="date"> 用（ローカル日付） */
export const toDateInput = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const fromDateInput = (value: string): string | null => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 12, 0, 0).toISOString();
};
