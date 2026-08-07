import React, { useEffect, useMemo, useState } from 'react';
import {
    ChevronLeft, ChevronDown, ChevronUp, RefreshCw, ExternalLink, Images, AlertTriangle, Check,
    KeyRound, Copy, Ban, RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    fetchEstimateSummaries, matchesKeyword, EstimateSummary,
} from '../../lib/estimateQueries';
import { ESTIMATE_STATUS_LABEL, EstimateStatus } from '../../lib/estimateStatus';
import {
    CaseProgress, CaseTask, CaseTaskEvent, EMPTY_PROGRESS, OWNER_LABEL, PHASE_LABEL, PHASE_ORDER,
    TASK_STATUS_LABEL, TaskPhase, TaskStatus, fetchCaseTasks, fetchProgressMap, fetchTaskEvents,
    formatDateTime, formatDueDate, fromDateInput, generateCaseTasks, isOverdue, progressPercent,
    toDateInput, updateCaseTask,
} from '../../lib/caseTasks';
import {
    CaseCredential, IssuedCredential, buildCredentialText, fetchCredential, fetchTaskSiteBaseUrl,
    issueCredential, setCredentialActive,
} from '../../lib/caseAccess';

/** 進行中とみなす案件のステータス */
const ACTIVE_STATUSES: EstimateStatus[] = ['ordered', 'completed', 'invoiced'];

interface Props {
    onBack: () => void;
    onOpenEstimate: (id: number) => void;
}

const CaseTaskPage: React.FC<Props> = ({ onBack, onOpenEstimate }) => {
    const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
    const [progressMap, setProgressMap] = useState<Map<number, CaseProgress>>(new Map());
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [activeOnly, setActiveOnly] = useState(true);
    const [actorName, setActorName] = useState('');

    // 案件詳細
    const [openedId, setOpenedId] = useState<number | null>(null);
    const [tasks, setTasks] = useState<CaseTask[]>([]);
    const [events, setEvents] = useState<CaseTaskEvent[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

    // 喪主用ログイン情報
    const [credential, setCredential] = useState<CaseCredential | null>(null);
    const [issued, setIssued] = useState<IssuedCredential | null>(null);
    const [siteBaseUrl, setSiteBaseUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            const email = data.user?.email || '';
            setActorName(email.split('@')[0] || 'スタッフ');
        });
        loadList();
    }, []);

    const loadList = async () => {
        setLoading(true);
        try {
            const summaries = await fetchEstimateSummaries();
            setEstimates(summaries);
            setProgressMap(await fetchProgressMap(summaries.map(e => e.id)));
        } catch (error) {
            console.error('Failed to fetch case tasks:', error);
            alert('タスクの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const loadDetail = async (estimateId: number) => {
        setDetailLoading(true);
        try {
            const [taskData, eventData, credentialData, baseUrl] = await Promise.all([
                fetchCaseTasks(estimateId),
                fetchTaskEvents(estimateId),
                fetchCredential(estimateId),
                fetchTaskSiteBaseUrl(),
            ]);
            setTasks(taskData);
            setEvents(eventData);
            setCredential(credentialData);
            setSiteBaseUrl(baseUrl);
        } catch (error) {
            console.error('Failed to fetch case detail:', error);
            alert('案件の取得に失敗しました');
        } finally {
            setDetailLoading(false);
        }
    };

    const openCase = async (estimateId: number) => {
        setOpenedId(estimateId);
        setExpandedTaskId(null);
        setIssued(null);
        setCopied(false);
        await loadDetail(estimateId);
    };

    const closeCase = async () => {
        setOpenedId(null);
        setTasks([]);
        setEvents([]);
        setProgressMap(await fetchProgressMap(estimates.map(e => e.id)));
    };

    const handleGenerate = async (estimateId: number) => {
        setBusy(true);
        try {
            const result = await generateCaseTasks(estimateId);
            if (result.created === 0) {
                alert('追加されるタスクはありませんでした。');
            } else {
                alert(`${result.created}件のタスクを追加しました。`);
            }
            await loadDetail(estimateId);
        } catch (error) {
            console.error('Failed to generate tasks:', error);
            alert('タスクの生成に失敗しました');
        } finally {
            setBusy(false);
        }
    };

    const handleIssue = async (estimateId: number) => {
        if (credential && !confirm(
            '再発行すると、いまお渡ししているパスワードは使えなくなります。\n'
            + '喪主が開いている画面もログアウトされます。よろしいですか？',
        )) return;

        setBusy(true);
        try {
            const result = await issueCredential(estimateId, actorName);
            setIssued(result);
            setCopied(false);
            setCredential(await fetchCredential(estimateId));
        } catch (error) {
            console.error('Failed to issue credential:', error);
            alert('ログイン情報の発行に失敗しました');
        } finally {
            setBusy(false);
        }
    };

    const handleToggleCredential = async (estimateId: number, active: boolean) => {
        setBusy(true);
        try {
            await setCredentialActive(estimateId, active);
            setCredential(await fetchCredential(estimateId));
        } catch (error) {
            console.error('Failed to update credential:', error);
            alert('ログイン情報の更新に失敗しました');
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = async () => {
        if (!issued) return;
        try {
            await navigator.clipboard.writeText(
                buildCredentialText(siteBaseUrl, issued.loginId, issued.password),
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('コピーできませんでした。手で控えてください。');
        }
    };

    const patchTask = async (task: CaseTask, patch: Partial<CaseTask>) => {
        // 画面を先に更新し、失敗したら読み直して戻す
        setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, ...patch } : t)));
        try {
            await updateCaseTask(task, patch as any, actorName);
            if (patch.status && openedId) setEvents(await fetchTaskEvents(openedId));
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('更新に失敗しました');
            if (openedId) await loadDetail(openedId);
        }
    };

    const results = useMemo(() => estimates.filter(estimate => {
        if (activeOnly && !ACTIVE_STATUSES.includes(estimate.status)) return false;
        return matchesKeyword(estimate, keyword);
    }), [estimates, keyword, activeOnly]);

    const openedEstimate = estimates.find(e => e.id === openedId) || null;

    if (loading) {
        return <div className="fl-shell"><div className="fl-empty">読み込み中...</div></div>;
    }

    // ================================================
    // 案件詳細
    // ================================================
    if (openedId !== null && openedEstimate) {
        const progress = tasks.reduce<CaseProgress>((acc, task) => {
            if (task.status === 'skipped') return acc;
            const next = { ...acc, total: acc.total + 1 };
            if (task.status === 'done') next.done += 1;
            return next;
        }, { ...EMPTY_PROGRESS });

        const phases = PHASE_ORDER.filter(phase => tasks.some(t => t.phase === phase));

        return (
            <div className="fl-shell">
                <div className="fl-page">
                    <div className="fl-page-head">
                        <button type="button" className="fl-back" onClick={closeCase}>
                            <ChevronLeft size={16} />一覧
                        </button>
                        <h2>案件 #{openedEstimate.id} ／ {openedEstimate.customerName} 様</h2>
                    </div>

                    <div className="fl-task-summary">
                        <div>
                            <div className="fl-task-summary-main">
                                {openedEstimate.deceasedName ? `故 ${openedEstimate.deceasedName} 様` : '故人名 未入力'}
                                <span className={`fl-status is-${openedEstimate.status}`}>
                                    {ESTIMATE_STATUS_LABEL[openedEstimate.status]}
                                </span>
                            </div>
                            <div className="fl-task-summary-sub">
                                {openedEstimate.funeralDate && `葬儀 ${openedEstimate.funeralDate}`}
                                {openedEstimate.venueName && ` / ${openedEstimate.venueName}`}
                                {` / ご請求 ¥${openedEstimate.totalPrice.toLocaleString()}`}
                            </div>
                        </div>
                        <div className="fl-task-summary-progress">
                            <div className="fl-task-bar">
                                <i style={{ width: `${progressPercent(progress)}%` }} />
                            </div>
                            <span>{progress.done} / {progress.total} 完了</span>
                        </div>
                    </div>

                    <div className="fl-toolbar">
                        <button
                            type="button"
                            className="fl-btn fl-btn-ghost"
                            onClick={() => handleGenerate(openedEstimate.id)}
                            disabled={busy}
                        >
                            <RefreshCw size={14} />
                            {tasks.length === 0 ? 'タスクを生成' : 'タスクを再判定'}
                        </button>
                        <button
                            type="button"
                            className="fl-btn fl-btn-ghost"
                            onClick={() => onOpenEstimate(openedEstimate.id)}
                        >
                            <ExternalLink size={14} />
                            案件を開く（請求書・領収書の発行）
                        </button>
                    </div>

                    <div className="fl-task-cred">
                        <h3 className="fl-task-phase-title">
                            <KeyRound size={14} /> 喪主用ログイン情報
                        </h3>

                        {issued ? (
                            <>
                                <pre className="fl-task-cred-box">
{buildCredentialText(siteBaseUrl, issued.loginId, issued.password)}
                                </pre>
                                <p className="fl-note">
                                    パスワードを表示できるのはこの1回だけです。コピーして喪主にお渡しください。
                                </p>
                            </>
                        ) : credential ? (
                            <div className="fl-task-cred-box">
                                ID: {credential.login_id}　
                                {credential.is_active ? '有効' : '停止中'}
                                {credential.last_login_at
                                    ? `　最終ログイン ${formatDateTime(credential.last_login_at)}`
                                    : '　未ログイン'}
                            </div>
                        ) : (
                            <p className="fl-note">まだ発行していません。</p>
                        )}

                        <div className="fl-toolbar" style={{ marginTop: 10, marginBottom: 0 }}>
                            <button
                                type="button"
                                className="fl-btn fl-btn-primary"
                                onClick={() => handleIssue(openedEstimate.id)}
                                disabled={busy}
                            >
                                <KeyRound size={14} />
                                {credential ? '再発行' : '発行'}
                            </button>

                            {issued && (
                                <button type="button" className="fl-btn fl-btn-ghost" onClick={handleCopy}>
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? 'コピーしました' : 'まとめてコピー'}
                                </button>
                            )}

                            {credential && (
                                <button
                                    type="button"
                                    className="fl-btn fl-btn-ghost"
                                    onClick={() => handleToggleCredential(openedEstimate.id, !credential.is_active)}
                                    disabled={busy}
                                >
                                    {credential.is_active ? <Ban size={14} /> : <RotateCcw size={14} />}
                                    {credential.is_active ? '停止する' : '再開する'}
                                </button>
                            )}
                        </div>

                        {!siteBaseUrl && (
                            <p className="fl-note">
                                喪主サイトのURLが未設定です。管理画面の「タスクマスタ管理」で設定してください。
                            </p>
                        )}
                    </div>

                    {detailLoading && <div className="fl-empty">読み込み中...</div>}

                    {!detailLoading && tasks.length === 0 && (
                        <div className="fl-empty">
                            タスクがまだありません。「タスクを生成」を押すと、見積のプランに応じて作成されます。
                        </div>
                    )}

                    {!detailLoading && phases.map(phase => (
                        <div key={phase} className="fl-task-phase">
                            <h3 className="fl-task-phase-title">{PHASE_LABEL[phase as TaskPhase]}</h3>
                            <div className="fl-card">
                                {tasks.filter(t => t.phase === phase).map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        expanded={expandedTaskId === task.id}
                                        onToggle={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                        onPatch={patch => patchTask(task, patch)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {events.length > 0 && (
                        <div className="fl-task-phase">
                            <h3 className="fl-task-phase-title">更新履歴</h3>
                            <div className="fl-card">
                                <div className="fl-task-history">
                                    {events.map(event => (
                                        <div key={event.id}>
                                            {formatDateTime(event.created_at)}
                                            <b>{event.actor_name || event.actor_role}</b>
                                            {describeEvent(event)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="fl-note">
                        喪主のチェックは「確認済み」までです。完了の確定はスタッフが行います。
                    </p>
                </div>
            </div>
        );
    }

    // ================================================
    // 案件一覧
    // ================================================
    return (
        <div className="fl-shell">
            <div className="fl-page">
                <div className="fl-page-head">
                    <button type="button" className="fl-back" onClick={onBack}>
                        <ChevronLeft size={16} />TOP
                    </button>
                    <h2>タスク進捗</h2>
                </div>

                <div className="fl-toolbar">
                    <button
                        type="button"
                        className={`fl-btn ${activeOnly ? 'fl-btn-primary' : 'fl-btn-ghost'}`}
                        onClick={() => setActiveOnly(!activeOnly)}
                    >
                        {activeOnly ? '進行中のみ' : 'すべての案件'}
                    </button>
                </div>

                <input
                    type="text"
                    className="fl-search"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="顧客名・故人名で検索（案件番号・電話番号も可）"
                />

                <div className="fl-card">
                    {results.map(estimate => {
                        const progress = progressMap.get(estimate.id) || EMPTY_PROGRESS;
                        return (
                            <div key={estimate.id} className="fl-row">
                                <button
                                    type="button"
                                    className="fl-row-main"
                                    onClick={() => openCase(estimate.id)}
                                >
                                    <span className="fl-row-title">
                                        {estimate.customerName} 様
                                        <span className={`fl-status is-${estimate.status}`}>
                                            {ESTIMATE_STATUS_LABEL[estimate.status]}
                                        </span>
                                        {progress.overdue > 0 && (
                                            <span className="fl-task-flag is-late">遅延 {progress.overdue}</span>
                                        )}
                                        {progress.awaitingConfirm > 0 && (
                                            <span className="fl-task-flag is-confirm">確認 {progress.awaitingConfirm}</span>
                                        )}
                                    </span>
                                    <span className="fl-row-deceased">
                                        {estimate.deceasedName ? `故 ${estimate.deceasedName} 様` : '故人名 未入力'}
                                    </span>
                                    <span className="fl-row-sub">
                                        案件 #{estimate.id}
                                        {estimate.funeralDate && ` / 葬儀 ${estimate.funeralDate}`}
                                        {estimate.venueName && ` / ${estimate.venueName}`}
                                        {progress.nextTask
                                            ? ` / 次: ${progress.nextTask.title}`
                                            : ' / 次のFL作業なし'}
                                    </span>
                                </button>
                                <div className="fl-row-actions">
                                    {progress.total === 0 ? (
                                        <span className="fl-badge">未生成</span>
                                    ) : (
                                        <div className="fl-task-mini">
                                            <div className="fl-task-bar">
                                                <i style={{ width: `${progressPercent(progress)}%` }} />
                                            </div>
                                            <span>{progress.done} / {progress.total}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {results.length === 0 && (
                        <div className="fl-empty">
                            {keyword ? '該当する案件が見つかりません' : '進行中の案件がありません'}
                        </div>
                    )}
                </div>

                <p className="fl-note">
                    進行中＝受注・施行済・請求済の案件です。最新500件を対象にしています。
                </p>
            </div>
        </div>
    );
};

// ================================================
// タスク1行
// ================================================

interface RowProps {
    task: CaseTask;
    expanded: boolean;
    onToggle: () => void;
    onPatch: (patch: Partial<CaseTask>) => void;
}

const TaskRow: React.FC<RowProps> = ({ task, expanded, onToggle, onPatch }) => {
    const late = isOverdue(task);

    // 文字入力は1文字ごとに保存せず、フォーカスが外れたときにまとめて送る
    const [assignee, setAssignee] = useState(task.assignee_name);
    const [staffNote, setStaffNote] = useState(task.staff_note);
    const [sharedNote, setSharedNote] = useState(task.shared_note);

    useEffect(() => {
        setAssignee(task.assignee_name);
        setStaffNote(task.staff_note);
        setSharedNote(task.shared_note);
    }, [task.id, task.assignee_name, task.staff_note, task.shared_note]);

    const commit = (key: 'assignee_name' | 'staff_note' | 'shared_note', value: string) => {
        if (value === task[key]) return;
        onPatch({ [key]: value } as Partial<CaseTask>);
    };

    return (
        <div className={`fl-task-row${task.status === 'done' ? ' is-done' : ''}${late ? ' is-late' : ''}`}>
            <div className="fl-task-row-head">
                <select
                    className="fl-task-status"
                    value={task.status}
                    onChange={e => onPatch({ status: e.target.value as TaskStatus })}
                >
                    {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map(status => (
                        <option key={status} value={status}>{TASK_STATUS_LABEL[status]}</option>
                    ))}
                </select>

                <div className="fl-task-title">
                    <span>{task.title}</span>
                    <span className="fl-task-owner">{OWNER_LABEL[task.owner]}</span>
                    {!task.visible_to_mourner && <span className="fl-task-flag">社内のみ</span>}
                    {task.mourner_confirmed_at && task.status !== 'done' && (
                        <span className="fl-task-flag is-confirm">
                            <Check size={11} />喪主 確認済み
                        </span>
                    )}
                    {late && (
                        <span className="fl-task-flag is-late">
                            <AlertTriangle size={11} />遅延
                        </span>
                    )}
                </div>

                <input
                    type="date"
                    className="fl-task-due"
                    value={toDateInput(task.due_at)}
                    onChange={e => onPatch({ due_at: fromDateInput(e.target.value) })}
                    title="期日"
                />

                <input
                    type="text"
                    className="fl-task-assignee"
                    value={assignee}
                    onChange={e => setAssignee(e.target.value)}
                    onBlur={() => commit('assignee_name', assignee)}
                    placeholder="担当者"
                />

                <button type="button" className="fl-icon-btn" onClick={onToggle}>
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            {expanded && (
                <div className="fl-task-detail">
                    {task.description && <p className="fl-note">{task.description}</p>}

                    <div className="fl-field">
                        <label>社内メモ（喪主には表示しません）</label>
                        <textarea
                            rows={2}
                            value={staffNote}
                            onChange={e => setStaffNote(e.target.value)}
                            onBlur={() => commit('staff_note', staffNote)}
                        />
                    </div>

                    <div className="fl-field">
                        <label>喪主への連絡事項</label>
                        <textarea
                            rows={2}
                            value={sharedNote}
                            onChange={e => setSharedNote(e.target.value)}
                            onBlur={() => commit('shared_note', sharedNote)}
                        />
                    </div>

                    <div className="fl-task-detail-actions">
                        <label className="fl-task-check">
                            <input
                                type="checkbox"
                                checked={task.visible_to_mourner}
                                onChange={e => onPatch({ visible_to_mourner: e.target.checked })}
                            />
                            喪主に表示する
                        </label>

                        {task.related_item_id !== null && (
                            <button
                                type="button"
                                className="fl-btn fl-btn-ghost"
                                onClick={() => window.open(`/?catalog=true&item=${task.related_item_id}`, '_blank')}
                            >
                                <Images size={14} />画像カタログ
                            </button>
                        )}
                    </div>

                    <p className="fl-note">
                        {task.completed_at
                            ? `完了 ${formatDateTime(task.completed_at)}${task.completed_by_name ? ` / ${task.completed_by_name}` : ''}`
                            : task.due_at ? `期日 ${formatDueDate(task.due_at)}` : '期日なし'}
                        {task.auto_complete_on === 'invoice' && ' ／ 請求書の発行で自動完了'}
                        {task.auto_complete_on === 'receipt' && ' ／ 領収書の発行で自動完了'}
                    </p>
                </div>
            )}
        </div>
    );
};

const describeEvent = (event: CaseTaskEvent): string => {
    if (event.action === 'status') {
        const to = TASK_STATUS_LABEL[event.to_value as TaskStatus] ?? event.to_value;
        return ` 状態を「${to}」に変更`;
    }
    if (event.action === 'confirm') return ' 確認済みにしました';
    if (event.action === 'due') return ` 期日を ${formatDueDate(event.to_value)} に変更`;
    if (event.action === 'assignee') return ` 担当者を「${event.to_value || '未割当'}」に変更`;
    return ` ${event.action}`;
};

export default CaseTaskPage;
