import React, { useEffect, useState } from 'react';
import {
    Billing, CaseSummary, PHASE_LABEL, PHASE_ORDER, PublicTask, TaskPhase,
    fetchBilling, formatDate, formatDue, formatYen, isMourneryTask, isOverdue,
    setConfirmed, toUserMessage,
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

const MournerView: React.FC<Props> = ({
    token, caseSummary, tasks, loading, error, onChanged, onLogout,
}) => {
    const [billing, setBilling] = useState<Billing | null>(null);
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

    // 次にお願いしたいこと＝喪主が動く未完了のうち、いちばん上のもの
    const next = tasks.find(t => t.status !== 'done' && t.status !== 'skipped' && isMourneryTask(t));

    // 支払いが終わっていれば、葬儀後のご案内に切り替える
    const paymentDone = tasks.some(t => t.phase === 'payment')
        && tasks.filter(t => t.phase === 'payment').every(t => t.status === 'done' || t.status === 'skipped');

    const handleConfirm = async (task: PublicTask) => {
        setMessage('');
        try {
            await setConfirmed(token, task.id, !task.mourner_confirmed_at);
            onChanged();
        } catch (err) {
            setMessage(toUserMessage(err));
        }
    };

    const phases = PHASE_ORDER.filter(phase => tasks.some(t => t.phase === phase));

    return (
        <div className="app">
            <header className="site-header">
                <p className="brand">FIRST LEAF</p>
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
                            <span>ご準備の進捗</span>
                            <strong>{done}<small> / {counted.length}</small></strong>
                        </div>
                        <div className="bar"><i style={{ width: `${percent}%` }} /></div>
                        {next && (
                            <div className="next">
                                <span>次にお願いしたいこと</span>
                                {next.title}
                                {next.due_at && `（${formatDue(next.due_at)}まで）`}
                            </div>
                        )}
                    </div>
                )}

                {phases.map(phase => (
                    <section className="section" key={phase}>
                        <h2 className="section-title">{PHASE_LABEL[phase as TaskPhase]}</h2>

                        {tasks.filter(t => t.phase === phase).map(task => {
                            const mine = isMourneryTask(task);
                            const isDone = task.status === 'done';
                            const confirmed = !!task.mourner_confirmed_at;
                            const late = isOverdue(task);
                            const open = openTaskId === task.id;

                            return (
                                <div className={`task${isDone ? ' is-done' : ''}`} key={task.id}>
                                    <button
                                        type="button"
                                        className={`check${isDone ? ' done' : confirmed ? ' conf' : ''}${!mine || isDone ? ' lock' : ''}`}
                                        onClick={() => mine && !isDone && handleConfirm(task)}
                                        disabled={!mine || isDone}
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
                                            {task.owner !== 'mourner' && <span className="badge b-fl">FL</span>}
                                            {mine && <span className="badge b-mo">ご家族</span>}
                                            {isDone && <span className="badge b-done">完了</span>}
                                            {!isDone && confirmed && (
                                                <span className="badge b-conf">確認済み・FL確認中</span>
                                            )}
                                            {!isDone && !confirmed && !mine && (
                                                <span className="badge b-gray">FL対応中</span>
                                            )}
                                            {!isDone && task.due_at && (
                                                <span className={`due${late ? ' late' : ''}`}>
                                                    〜{formatDue(task.due_at)}
                                                </span>
                                            )}
                                        </div>

                                        {task.shared_note && <p className="t-note">{task.shared_note}</p>}

                                        {open && (
                                            <div className="t-detail">
                                                {task.description || 'ご不明な点は担当者までお問い合わせください。'}
                                            </div>
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
                        })}
                    </section>
                ))}

                {paymentDone && (
                    <div className="cta">
                        <h2>葬儀後のお手続きもお手伝いします</h2>
                        <p>
                            年金の停止、保険の請求、各種名義変更など、<br />
                            期限のあるお手続きが続きます。
                        </p>
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
                <p>ファーストリーフ／お問い合わせ <a href="tel:0467385617">0467-38-5617</a></p>
            </footer>
        </div>
    );
};

export default MournerView;
