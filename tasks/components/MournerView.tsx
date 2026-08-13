import React, { useEffect, useState } from 'react';
import {
    Billing, CaseSummary, PHASE_LABEL, PHASE_ORDER, PublicTask, TaskPhase,
    fetchBilling, formatDate, formatDue, formatYen, isOverdue, setConfirmed, toUserMessage,
} from '../lib/api';

interface Props {
    token: string;
    caseSummary: CaseSummary | null;
    tasks: PublicTask[];
    loading: boolean;
    error: string;
    onChanged: () => void;
    onLogout: () => void;
}

type Tab = 'now' | 'all';

/**
 * 喪主の画面。
 *
 * FL担当のタスクはサーバー側で除いてあるため、ここに届くのは
 * すべて「ご家族にお願いすること」。既定は未完了のものだけを出し、
 * 切り替えで完了分も含めた全体を見せる。
 */
const MournerView: React.FC<Props> = ({
    token, caseSummary, tasks, loading, error, onChanged, onLogout,
}) => {
    const [billing, setBilling] = useState<Billing | null>(null);
    const [tab, setTab] = useState<Tab>('now');
    const [openTaskId, setOpenTaskId] = useState<number | null>(null);
    const [billingOpen, setBillingOpen] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchBilling(token)
            .then(setBilling)
            .catch(err => console.error('Failed to load billing:', err));
    }, [token]);

    const counted = tasks.filter(t => t.status !== 'skipped');
    const done = counted.filter(t => t.status === 'done').length;
    const percent = counted.length === 0 ? 0 : Math.round(done / counted.length * 100);

    const pending = counted
        .filter(t => t.status !== 'done')
        .sort((a, b) => {
            // 期日のあるものを先に、近い順
            if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
            if (a.due_at) return -1;
            if (b.due_at) return 1;
            return a.sort_order - b.sort_order;
        });

    // 支払いがすべて終わっていれば、葬儀後のご案内に切り替える
    const paymentTasks = tasks.filter(t => t.phase === 'payment');
    const paymentDone = paymentTasks.length > 0
        && paymentTasks.every(t => t.status === 'done' || t.status === 'skipped');

    const handleConfirm = async (task: PublicTask) => {
        setMessage('');
        try {
            await setConfirmed(token, task.id, !task.mourner_confirmed_at);
            onChanged();
        } catch (err) {
            setMessage(toUserMessage(err));
        }
    };

    const renderTask = (task: PublicTask) => {
        const isDone = task.status === 'done';
        const confirmed = !!task.mourner_confirmed_at;
        const late = isOverdue(task);
        const open = openTaskId === task.id;

        return (
            <div className={`task${isDone ? ' is-done' : ''}`} key={task.id}>
                <button
                    type="button"
                    className={`check${isDone ? ' done lock' : confirmed ? ' conf' : ''}`}
                    onClick={() => !isDone && handleConfirm(task)}
                    disabled={isDone}
                    aria-label={isDone ? '完了' : confirmed ? '確認済み' : '確認する'}
                >
                    {(isDone || confirmed) && '✓'}
                </button>

                <div className="t-main">
                    <button
                        type="button"
                        className="t-title"
                        onClick={() => setOpenTaskId(open ? null : task.id)}
                    >
                        {task.title}
                    </button>

                    <div className="t-meta">
                        {isDone && <span className="badge b-done">完了</span>}
                        {!isDone && confirmed && (
                            <span className="badge b-conf">確認済み</span>
                        )}
                        {!isDone && task.due_at && (
                            <span className={`due${late ? ' late' : ''}`}>
                                {formatDue(task.due_at)}まで
                            </span>
                        )}
                    </div>

                    {task.shared_note && <p className="t-note">{task.shared_note}</p>}

                    {open && task.description && (
                        <div className="t-detail">{task.description}</div>
                    )}

                    {task.phase === 'payment' && billing && (
                        <div className="t-detail">
                            <dl>
                                <dt>ご請求額</dt>
                                <dd className="amount">{formatYen(billing.total)}</dd>
                                {billing.due_date && (
                                    <>
                                        <dt>お支払期限</dt>
                                        <dd>{formatDate(billing.due_date)}</dd>
                                    </>
                                )}
                            </dl>

                            {billing.lines.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        className={`acc-btn${billingOpen ? ' open' : ''}`}
                                        onClick={() => setBillingOpen(!billingOpen)}
                                    >
                                        内訳を見る <span className="chev">▾</span>
                                    </button>
                                    {billingOpen && (
                                        <table className="bill">
                                            <tbody>
                                                {billing.lines.map((line, index) => (
                                                    <tr key={`${line.name}-${index}`}>
                                                        <td>{line.name}</td>
                                                        <td>{line.amount.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                <tr className="sum">
                                                    <td>合計</td>
                                                    <td>{billing.total.toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}

                            {billing.bank_info && (
                                <div className="bank">
                                    <b>お振込先</b><br />
                                    {billing.bank_info}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const phases = PHASE_ORDER.filter(phase => tasks.some(t => t.phase === phase));

    return (
        <div className="app">
            <header className="site-header">
                <h1>{caseSummary?.deceased_name ? `故 ${caseSummary.deceased_name} 様` : 'ご葬儀の進捗'}</h1>
                {caseSummary?.funeral_date && (
                    <p>{formatDate(caseSummary.funeral_date)} 告別式</p>
                )}
                {caseSummary?.venue_name && <p>{caseSummary.venue_name}</p>}
            </header>

            <main className="page">
                {error && <p className="error">{error}</p>}
                {message && <p className="error">{message}</p>}
                {loading && <p className="lead">読み込み中...</p>}

                {paymentDone ? (
                    <div className="done-hero">
                        <div className="mark">✓</div>
                        <h2>ご葬儀のお手続きは完了しました</h2>
                        <p>この度は誠にありがとうございました</p>
                    </div>
                ) : (
                    <div className="progress-card">
                        <div className="progress-top">
                            <span>ご準備の状況</span>
                            <strong>{done}<small> / {counted.length}</small></strong>
                        </div>
                        <div className="bar"><i style={{ width: `${percent}%` }} /></div>
                        {pending[0] && (
                            <div className="next">
                                <span>次にお願いしたいこと</span>
                                {pending[0].title}
                                {pending[0].due_at && `（${formatDue(pending[0].due_at)}まで）`}
                            </div>
                        )}
                    </div>
                )}

                {tasks.length > 0 && (
                    <div className="tabs">
                        <button
                            type="button"
                            className={tab === 'now' ? 'on' : ''}
                            onClick={() => setTab('now')}
                        >
                            お願いしたいこと {pending.length}
                        </button>
                        <button
                            type="button"
                            className={tab === 'all' ? 'on' : ''}
                            onClick={() => setTab('all')}
                        >
                            すべて {counted.length}
                        </button>
                    </div>
                )}

                {tab === 'now' && (
                    pending.length > 0 ? (
                        <section className="section">
                            {pending.map(renderTask)}
                        </section>
                    ) : (
                        tasks.length > 0 && (
                            <div className="empty-hero">
                                <div className="mark">✓</div>
                                <h2>いまお願いすることはありません</h2>
                                <p>新しくお願いすることが出てきましたら、こちらに表示されます。</p>
                            </div>
                        )
                    )
                )}

                {tab === 'all' && phases.map(phase => (
                    <section className="section" key={phase}>
                        <h2 className="section-title">{PHASE_LABEL[phase as TaskPhase]}</h2>
                        {tasks.filter(t => t.phase === phase).map(renderTask)}
                    </section>
                ))}

                {paymentDone && (
                    <div className="cta">
                        <h2>葬儀後のお手続きもお手伝いします</h2>
                        <p>年金の停止や保険の請求など、期限のあるお手続きが続きます。</p>
                        <a href="tel:0467385617">お電話で相談する 0467-38-5617</a>
                    </div>
                )}

                {tasks.length === 0 && !loading && (
                    <p className="lead">
                        まだ項目がありません。担当者が準備でき次第、こちらに表示されます。
                    </p>
                )}
            </main>

            <footer className="site-footer">
                <button type="button" className="link" onClick={onLogout}>ログアウト</button>
                <p>お問い合わせ <a href="tel:0467385617">0467-38-5617</a></p>
            </footer>
        </div>
    );
};

export default MournerView;
