// ================================================
// タスク進捗（喪主）サイト用 API
//
//   供花の flower-public と同じ考え方。
//   喪主サイトに Supabase の鍵を持たせず、DBへのアクセスはこの関数の中だけで行う。
//
//   POST { action: 'login',       login_id, password }
//   POST { action: 'session',     token }
//   POST { action: 'cases',       token }                    … スタッフのみ
//   POST { action: 'tasks',       token, estimate_id? }
//   POST { action: 'billing',     token, estimate_id? }
//   POST { action: 'update_task', token, task_id, ... }
//   POST { action: 'logout',      token }
//
//   喪主が変更できるのは自分の担当タスクの「確認済み」だけ。
//   完了の確定と、期日・担当者・メモの変更はスタッフのみ。
// ================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

const env = (key: string): string => Deno.env.get(key) ?? '';

const admin = createClient(
    env('SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
);

/** スタッフの検証だけは通常の認証エンドポイントを使う */
const authClient = createClient(
    env('SUPABASE_URL'),
    env('SUPABASE_ANON_KEY'),
    { auth: { persistSession: false } },
);

const SESSION_DAYS = 14;

// ================================================
// セッション
// ================================================

interface Session {
    token: string;
    estimate_id: number | null;
    role: 'mourner' | 'staff';
    actor_name: string;
    expires_at: string;
}

const randomToken = (): string => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

const createSession = async (
    role: 'mourner' | 'staff', estimateId: number | null, actorName: string,
): Promise<Session> => {
    const session = {
        token: randomToken(),
        estimate_id: estimateId,
        role,
        actor_name: actorName,
        expires_at: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { error } = await admin.from('case_sessions').insert([session]);
    if (error) throw error;

    return session;
};

const readSession = async (token: unknown): Promise<Session | null> => {
    if (typeof token !== 'string' || token.length < 32) return null;

    const { data } = await admin
        .from('case_sessions')
        .select('token, estimate_id, role, actor_name, expires_at')
        .eq('token', token)
        .maybeSingle();

    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) {
        await admin.from('case_sessions').delete().eq('token', token);
        return null;
    }
    return data as Session;
};

/**
 * この呼び出しが触ってよい案件を決める。
 * 喪主のトークンは、必ず自分の案件に固定する（引数の estimate_id は見ない）。
 */
const resolveEstimateId = (session: Session, requested: unknown): number | null => {
    if (session.role === 'mourner') return session.estimate_id;
    if (typeof requested === 'number') return requested;
    return null;
};

// ================================================
// 案件の概要
// ================================================

const caseSummary = async (estimateId: number) => {
    const { data } = await admin
        .from('estimates')
        .select('id, customer_info, total_price, status, invoice_issued_at')
        .eq('id', estimateId)
        .maybeSingle();

    if (!data) return null;

    const info = data.customer_info || {};
    return {
        estimate_id: data.id,
        deceased_name: info.deceasedName || '',
        chief_mourner_name: info.chiefMournerName || info.applicantName || '',
        funeral_date: info.funeralDate || '',
        venue_name: info.venueName || '',
        venue_address: info.venueAddress || '',
        status: data.status || 'quoted',
    };
};

// ================================================
// タスク
//   喪主には visible_to_mourner のものだけを返し、社内メモは落とす。
// ================================================

const mournerTaskFields = [
    'id', 'code', 'title', 'description', 'phase', 'owner', 'status',
    'due_at', 'shared_note', 'mourner_confirmed_at', 'completed_at',
    'related_item_id', 'sort_order',
].join(', ');

const listTasks = async (session: Session, estimateId: number) => {
    if (session.role === 'mourner') {
        const { data, error } = await admin
            .from('case_tasks')
            .select(mournerTaskFields)
            .eq('estimate_id', estimateId)
            .eq('visible_to_mourner', true)
            .order('sort_order');

        if (error) throw error;
        return data || [];
    }

    const { data, error } = await admin
        .from('case_tasks')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sort_order');

    if (error) throw error;
    return data || [];
};

// ================================================
// 請求情報
//   金額はここで案件から引き直す。クライアントから受け取らない。
// ================================================

const billing = async (estimateId: number) => {
    const [estimateResult, settingsResult] = await Promise.all([
        admin.from('estimates')
            .select('total_price, content, status, invoice_issued_at, receipt_issued_at')
            .eq('id', estimateId).maybeSingle(),
        admin.from('flower_settings')
            .select('bank_info, payment_due_days').eq('id', 1).maybeSingle(),
    ]);

    const estimate = estimateResult.data;
    if (!estimate) return null;

    const dueDays = settingsResult.data?.payment_due_days ?? 30;
    const issuedAt = estimate.invoice_issued_at;
    const dueDate = issuedAt
        ? new Date(new Date(issuedAt).getTime() + dueDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    return {
        total: estimate.total_price ?? 0,
        lines: buildLines(estimate.content),
        bank_info: settingsResult.data?.bank_info || '',
        invoice_issued_at: issuedAt ?? null,
        receipt_issued_at: estimate.receipt_issued_at ?? null,
        due_date: dueDate,
    };
};

/**
 * 内訳（アコーディオンで開く用）。
 * 見積のスナップショットから、プランと金額の付いた品目だけを取り出す。
 */
const buildLines = (content: any): { name: string; amount: number }[] => {
    if (!content?.plan) return [];

    const planId = content.plan.id;
    const items: any[] = content.items ?? [];
    const lines = [{ name: content.plan.name, amount: content.plan.price ?? 0 }];

    const priceOf = (item: any, optionId?: string): number => {
        if (optionId) {
            const option = (item.options ?? []).find((o: any) => o.id === optionId);
            if (!option) return 0;
            return option.planPrices?.[planId] ?? option.price ?? 0;
        }
        if (item.includedInPlans?.includes(planId)) return 0;
        return item.basePrice ?? 0;
    };

    for (const id of content.selectedOptions ?? []) {
        const item = items.find(i => i.id === id);
        if (item) lines.push({ name: item.name, amount: priceOf(item) });
    }

    for (const [id, optionId] of content.selectedGrades ?? []) {
        const item = items.find(i => i.id === id);
        if (!item) continue;
        const option = (item.options ?? []).find((o: any) => o.id === optionId);
        lines.push({
            name: option ? `${item.name}（${option.name}）` : item.name,
            amount: priceOf(item, optionId),
        });
    }

    for (const [id, value] of content.freeInputValues ?? []) {
        const item = items.find(i => i.id === id);
        if (item && value) lines.push({ name: item.name, amount: value });
    }

    for (const [id, selection] of content.multiGradeValues ?? []) {
        const item = items.find(i => i.id === id);
        if (!item) continue;
        let subtotal = 0;
        for (const [gradeId, quantity] of Object.entries(selection?.quantities ?? {})) {
            subtotal += priceOf(item, gradeId) * (quantity as number);
        }
        if (selection?.discountType === 'amount') subtotal -= selection.discountValue ?? 0;
        if (selection?.discountType === 'percent') {
            subtotal -= Math.round(subtotal * (selection.discountValue ?? 0) / 100);
        }
        if (subtotal > 0) lines.push({ name: item.name, amount: subtotal });
    }

    return lines.filter(line => line.amount > 0);
};

// ================================================
// 更新
// ================================================

const updateTask = async (session: Session, body: Record<string, unknown>) => {
    const taskId = Number(body.task_id);
    if (!taskId) throw new Error('INVALID_TASK');

    const { data: task } = await admin
        .from('case_tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

    if (!task) throw new Error('TASK_NOT_FOUND');

    // 喪主のトークンで他人の案件を触らせない
    if (session.role === 'mourner' && task.estimate_id !== session.estimate_id) {
        throw new Error('FORBIDDEN');
    }

    if (session.role === 'mourner') {
        if (!task.visible_to_mourner || task.owner === 'fl') throw new Error('FORBIDDEN');

        const confirmed = body.confirmed === true;
        const { error } = await admin
            .from('case_tasks')
            .update({ mourner_confirmed_at: confirmed ? new Date().toISOString() : null })
            .eq('id', taskId);
        if (error) throw error;

        await admin.from('case_task_events').insert([{
            task_id: taskId,
            action: 'confirm',
            from_value: task.mourner_confirmed_at ? 'confirmed' : null,
            to_value: confirmed ? 'confirmed' : null,
            actor_role: 'mourner',
            actor_name: '喪主',
        }]);
        return { ok: true };
    }

    // ---- スタッフ ----
    const patch: Record<string, unknown> = {};
    if (typeof body.status === 'string') patch.status = body.status;
    if (typeof body.assignee_name === 'string') patch.assignee_name = body.assignee_name;
    if (typeof body.staff_note === 'string') patch.staff_note = body.staff_note;
    if (typeof body.shared_note === 'string') patch.shared_note = body.shared_note;
    if (body.due_at === null || typeof body.due_at === 'string') patch.due_at = body.due_at;

    if (patch.status && patch.status !== task.status) {
        const done = patch.status === 'done';
        patch.completed_at = done ? new Date().toISOString() : null;
        patch.completed_by_role = done ? 'staff' : null;
        patch.completed_by_name = done ? session.actor_name : '';
    }

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await admin.from('case_tasks').update(patch).eq('id', taskId);
    if (error) throw error;

    if (patch.status && patch.status !== task.status) {
        await admin.from('case_task_events').insert([{
            task_id: taskId,
            action: 'status',
            from_value: task.status,
            to_value: patch.status,
            actor_role: 'staff',
            actor_name: session.actor_name,
        }]);
    }
    return { ok: true };
};

// ================================================
// ログイン
// ================================================

const login = async (loginId: unknown, password: unknown) => {
    if (typeof loginId !== 'string' || typeof password !== 'string'
        || !loginId.trim() || !password) {
        return null;
    }

    // メールアドレスならスタッフとして扱う
    if (loginId.includes('@')) {
        const { data, error } = await authClient.auth.signInWithPassword({
            email: loginId.trim(),
            password,
        });
        if (error || !data.user) return null;

        const name = (data.user.email || '').split('@')[0] || 'スタッフ';
        await authClient.auth.signOut();
        return createSession('staff', null, name);
    }

    const { data: estimateId } = await admin.rpc('case_login', {
        p_login_id: loginId.trim(),
        p_password: password,
    });

    if (!estimateId) return null;
    return createSession('mourner', estimateId as number, '喪主');
};

// ================================================
// エントリポイント
// ================================================

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'login') {
            const session = await login(body.login_id, body.password);
            if (!session) return json({ error: 'INVALID_LOGIN' }, 401);

            // ついでに期限切れのセッションを掃除する
            admin.rpc('purge_expired_case_sessions').then(() => {});

            return json({
                token: session.token,
                role: session.role,
                expires_at: session.expires_at,
                case: session.estimate_id ? await caseSummary(session.estimate_id) : null,
            });
        }

        const session = await readSession(body.token);
        if (!session) return json({ error: 'INVALID_SESSION' }, 401);

        if (action === 'session') {
            return json({
                role: session.role,
                expires_at: session.expires_at,
                case: session.estimate_id ? await caseSummary(session.estimate_id) : null,
            });
        }

        if (action === 'logout') {
            await admin.from('case_sessions').delete().eq('token', session.token);
            return json({ ok: true });
        }

        if (action === 'cases') {
            if (session.role !== 'staff') return json({ error: 'FORBIDDEN' }, 403);

            const { data } = await admin
                .from('estimates')
                .select('id, customer_info, status')
                .in('status', ['ordered', 'completed', 'invoiced'])
                .order('id', { ascending: false })
                .limit(100);

            return json((data || []).map(row => {
                const info = row.customer_info || {};
                return {
                    estimate_id: row.id,
                    deceased_name: info.deceasedName || '',
                    chief_mourner_name: info.chiefMournerName || info.applicantName || '',
                    funeral_date: info.funeralDate || '',
                    venue_name: info.venueName || '',
                    status: row.status,
                };
            }));
        }

        const estimateId = resolveEstimateId(session, body.estimate_id);
        if (action === 'tasks') {
            if (!estimateId) return json({ error: 'NO_CASE' }, 400);
            return json({
                case: await caseSummary(estimateId),
                tasks: await listTasks(session, estimateId),
            });
        }

        if (action === 'billing') {
            if (!estimateId) return json({ error: 'NO_CASE' }, 400);
            return json(await billing(estimateId));
        }

        if (action === 'update_task') {
            return json(await updateTask(session, body));
        }

        return json({ error: 'UNKNOWN_ACTION' }, 400);
    } catch (error) {
        console.error('task-public failed:', error);
        const message = error instanceof Error ? error.message : 'UNEXPECTED';
        const status = message === 'FORBIDDEN' ? 403 : 400;
        return json({ error: message }, status);
    }
});
