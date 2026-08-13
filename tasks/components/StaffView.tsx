import React, { useState } from 'react';
import {
    CaseSummary, PHASE_LABEL, PHASE_ORDER, PublicTask, StaffCase, TaskPhase, TaskStatus,
    formatDate, formatDue, isOverdue, setStatus, toUserMessage,
} from '../lib/api';

const STATUS_LABEL: Record<TaskStatus, string> = {
    todo: '未着手',
    doing: '対応中',
    done: '完了',
    skipped: '対象外',
};

interface Props {
    token: string;
    cases: StaffCase[];
    openedCaseId: number | null;
    caseSummary: CaseSummary | null;
    tasks: PublicTask[];
    loading: boolean;
    error: string;
    onOpenCase: (estimateId: number) => void;
    onCloseCase: () => void;
    onChanged: () => void;
    onLogout: () => void;
}

/**
 * 現場からスマホで進捗を更新するための画面。
 * 一覧・編集の本体は見積システム側にある。
 */
const StaffView: React.FC<Props> = ({
    token, cases, openedCaseId, caseSummary, tasks, loading, error,
    onOpenCase, onCloseCase, onChanged, onLogout,
}) => {
    const [message, setMessage] = useState('');

    const handleStatus = async (task: PublicTask, status: TaskStatus) => {
        setMessage('');
        try {
            await setStatus(token, task.id, status);
            onChanged();
        } catch (err) {
            setMessage(toUserMessage(err));
        }
    };

    if (openedCaseId === null) {
        return (
            <div className="app">
                <header className="site-header is-staff">
                    <p className="brand">FIRST LEAF ／ スタッフ</p>
                    <h1>進行中の案件</h1>
                </header>

                <main className="page">
                    {error && <p className="error">{error}</p>}
                    {loading && <p className="lead">読み込み中...</p>}

                    {cases.map(item => (
                        <button
                            type="button"
                            className="case-row"
                            key={item.estimate_id}
                            onClick={() => onOpenCase(item.estimate_id)}
                        >
                            <span className="case-title">
                                {item.chief_mourner_name || '（顧客名なし）'} 様
                            </span>
                            <span className="case-sub">
                                案件 #{item.estimate_id}
                                {item.deceased_name && ` / 故 ${item.deceased_name} 様`}
                            </span>
                            <span className="case-sub">
                                {item.funeral_date && formatDate(item.funeral_date)}
                                {item.venue_name && ` / ${item.venue_name}`}
                            </span>
                        </button>
                    ))}

                    {cases.length === 0 && !loading && (
                        <p className="lead">進行中の案件がありません。</p>
                    )}
                </main>

                <footer className="site-footer">
                    <button type="button" className="link" onClick={onLogout}>ログアウト</button>
                </footer>
            </div>
        );
    }

    const phases = PHASE_ORDER.filter(phase => tasks.some(t => t.phase === phase));

    return (
        <div className="app">
            <header className="site-header is-staff">
                <button type="button" className="back" onClick={onCloseCase}>← 案件一覧</button>
                <h1>案件 #{openedCaseId}</h1>
                {caseSummary?.deceased_name && <p>故 {caseSummary.deceased_name} 様</p>}
                {caseSummary?.funeral_date && <p>{formatDate(caseSummary.funeral_date)}</p>}
            </header>

            <main className="page">
                {error && <p className="error">{error}</p>}
                {message && <p className="error">{message}</p>}
                {loading && <p className="lead">読み込み中...</p>}

                {phases.map(phase => (
                    <section className="section" key={phase}>
                        <h2 className="section-title">{PHASE_LABEL[phase as TaskPhase]}</h2>

                        {tasks.filter(t => t.phase === phase).map(task => (
                            <div className="staff-task" key={task.id}>
                                <div className="t-main">
                                    <div className="t-title-plain">
                                        {task.title}
                                        {task.visible_to_mourner === false && (
                                            <span className="badge b-gray">社内のみ</span>
                                        )}
                                        {task.mourner_confirmed_at && task.status !== 'done' && (
                                            <span className="badge b-conf">喪主 確認済み</span>
                                        )}
                                        {isOverdue(task) && <span className="badge b-late">遅延</span>}
                                    </div>
                                    <div className="t-meta">
                                        {task.due_at && <span className="due">{formatDue(task.due_at)}まで</span>}
                                        {task.assignee_name && <span className="due">{task.assignee_name}</span>}
                                    </div>
                                    {task.staff_note && <p className="t-note">{task.staff_note}</p>}
                                </div>

                                <select
                                    className="status-select"
                                    value={task.status}
                                    onChange={e => handleStatus(task, e.target.value as TaskStatus)}
                                >
                                    {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(status => (
                                        <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </section>
                ))}

                {tasks.length === 0 && !loading && (
                    <p className="lead">
                        タスクがまだありません。見積システムの「タスク進捗」から生成してください。
                    </p>
                )}
            </main>

            <footer className="site-footer">
                <button type="button" className="link" onClick={onLogout}>ログアウト</button>
            </footer>
        </div>
    );
};

export default StaffView;
