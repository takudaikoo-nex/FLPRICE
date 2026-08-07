import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { supabase } from '../lib/supabase';
import { generateCaseTasks } from '../lib/caseTasks';
import { linkEstimateToCustomer, updateEstimateCustomerInfo } from '../lib/customers';
import {
    EstimateStatus, ESTIMATE_STATUS_LABEL, ESTIMATE_STATUS_ORDER,
} from '../lib/estimateStatus';
import { formatDate } from '../lib/estimateQueries';

interface Props {
    estimateId: number;
    customers: Customer[];
    onClose: () => void;
    onSaved: () => void;
}

interface EditableInfo {
    deceasedName: string;
    applicantName: string;
    chiefMournerName: string;
    applicantPhone: string;
    funeralDate: string;
    venueName: string;
    venueAddress: string;
}

const EstimateEditModal: React.FC<Props> = ({ estimateId, customers, onClose, onSaved }) => {
    const [info, setInfo] = useState<EditableInfo>({
        deceasedName: '', applicantName: '', chiefMournerName: '', applicantPhone: '', funeralDate: '',
        venueName: '', venueAddress: '',
    });
    const [customerId, setCustomerId] = useState<string>('');
    const [status, setStatus] = useState<EstimateStatus>('quoted');
    // 受注に切り替わったときだけタスクを生成するため、読み込み時の値を覚えておく
    const [initialStatus, setInitialStatus] = useState<EstimateStatus>('quoted');
    const [note, setNote] = useState('');
    const [issued, setIssued] = useState<{ quote: string | null; invoice: string | null; receipt: string | null }>(
        { quote: null, invoice: null, receipt: null },
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('estimates')
                    .select('customer_info, customer_id, status, note, quote_issued_at, invoice_issued_at, receipt_issued_at')
                    .eq('id', estimateId)
                    .single();

                if (fetchError) throw fetchError;

                const source = data.customer_info || {};
                setInfo({
                    deceasedName: source.deceasedName || '',
                    applicantName: source.applicantName || '',
                    chiefMournerName: source.chiefMournerName || '',
                    applicantPhone: source.applicantPhone || '',
                    funeralDate: source.funeralDate || '',
                    venueName: source.venueName || '',
                    venueAddress: source.venueAddress || '',
                });
                setCustomerId(data.customer_id || '');
                setStatus((data.status ?? 'quoted') as EstimateStatus);
                setInitialStatus((data.status ?? 'quoted') as EstimateStatus);
                setNote(data.note || '');
                setIssued({
                    quote: data.quote_issued_at ?? null,
                    invoice: data.invoice_issued_at ?? null,
                    receipt: data.receipt_issued_at ?? null,
                });
            } catch (e) {
                console.error('Failed to load estimate:', e);
                setError('見積の読み込みに失敗しました。');
            } finally {
                setLoading(false);
            }
        })();
    }, [estimateId]);

    const update = (patch: Partial<EditableInfo>) => setInfo({ ...info, ...patch });

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await updateEstimateCustomerInfo(estimateId, { ...info });
            await linkEstimateToCustomer(estimateId, customerId || null);

            const { error: statusError } = await supabase
                .from('estimates')
                .update({ status, note })
                .eq('id', estimateId);
            if (statusError) throw statusError;

            // 受注になった時点で、見積の内容からタスクを生成する。
            // 生成に失敗しても案件の保存は成立しているため、タスク画面から作り直せるようにしておく。
            if (status === 'ordered' && initialStatus !== 'ordered') {
                try {
                    const result = await generateCaseTasks(estimateId);
                    if (result.created > 0) alert(`受注に伴い、タスクを${result.created}件作成しました。`);
                } catch (taskError) {
                    console.error('Failed to generate case tasks:', taskError);
                }
            }

            onSaved();
        } catch (e: any) {
            console.error('Failed to save estimate:', e);
            setError(`保存に失敗しました: ${e.message || e}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fl-modal-backdrop" onClick={onClose}>
            <div className="fl-modal" onClick={e => e.stopPropagation()}>
                <h3>見積 #{estimateId} の情報を編集</h3>

                {loading ? (
                    <div className="fl-empty">読み込み中...</div>
                ) : (
                    <>
                        <div className="fl-grid-2">
                            <div className="fl-field">
                                <label htmlFor="e-status">ステータス</label>
                                <select
                                    id="e-status"
                                    value={status}
                                    onChange={e => setStatus(e.target.value as EstimateStatus)}
                                >
                                    {ESTIMATE_STATUS_ORDER.map(key => (
                                        <option key={key} value={key}>{ESTIMATE_STATUS_LABEL[key]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="fl-field">
                                <label>帳票の発行状況</label>
                                <div className="fl-issued">
                                    <span>見積書 {issued.quote ? formatDate(issued.quote) : '未発行'}</span>
                                    <span>請求書 {issued.invoice ? formatDate(issued.invoice) : '未発行'}</span>
                                    <span>領収書 {issued.receipt ? formatDate(issued.receipt) : '未発行'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="fl-field">
                            <label htmlFor="e-customer">紐づく顧客</label>
                            <select
                                id="e-customer"
                                value={customerId}
                                onChange={e => setCustomerId(e.target.value)}
                            >
                                <option value="">（未紐付け）</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{c.phone ? `（${c.phone}）` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="fl-grid-2">
                            <div className="fl-field">
                                <label htmlFor="e-deceased">故人名</label>
                                <input
                                    id="e-deceased"
                                    type="text"
                                    value={info.deceasedName}
                                    onChange={e => update({ deceasedName: e.target.value })}
                                />
                            </div>
                            <div className="fl-field">
                                <label htmlFor="e-funeral">葬儀日</label>
                                <input
                                    id="e-funeral"
                                    type="date"
                                    value={info.funeralDate}
                                    onChange={e => update({ funeralDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="fl-grid-2">
                            <div className="fl-field">
                                <label htmlFor="e-applicant">申込者名</label>
                                <input
                                    id="e-applicant"
                                    type="text"
                                    value={info.applicantName}
                                    onChange={e => update({ applicantName: e.target.value })}
                                />
                            </div>
                            <div className="fl-field">
                                <label htmlFor="e-mourner">喪主名</label>
                                <input
                                    id="e-mourner"
                                    type="text"
                                    value={info.chiefMournerName}
                                    onChange={e => update({ chiefMournerName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="fl-grid-2">
                            <div className="fl-field">
                                <label htmlFor="e-venue">式場名</label>
                                <input
                                    id="e-venue"
                                    type="text"
                                    value={info.venueName}
                                    onChange={e => update({ venueName: e.target.value })}
                                />
                            </div>
                            <div className="fl-field">
                                <label htmlFor="e-venue-address">式場住所</label>
                                <input
                                    id="e-venue-address"
                                    type="text"
                                    value={info.venueAddress}
                                    onChange={e => update({ venueAddress: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="fl-field">
                            <label htmlFor="e-phone">電話番号</label>
                            <input
                                id="e-phone"
                                type="tel"
                                value={info.applicantPhone}
                                onChange={e => update({ applicantPhone: e.target.value })}
                            />
                        </div>

                        <div className="fl-field">
                            <label htmlFor="e-note">案件メモ</label>
                            <textarea
                                id="e-note"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="社内での申し送りなど"
                            />
                        </div>

                        <p className="fl-note">
                            ここでの変更は見積を呼び出したときの入力内容にも反映され、供花の発注受付を作成する際にも引き継がれます。
                            プランやオプションの変更は見積画面で行ってください。
                        </p>
                    </>
                )}

                {error && <p className="fl-error">{error}</p>}

                <div className="fl-actions">
                    <button type="button" className="fl-btn fl-btn-ghost" onClick={onClose} disabled={saving}>
                        キャンセル
                    </button>
                    <button
                        type="button"
                        className="fl-btn fl-btn-primary"
                        onClick={handleSave}
                        disabled={saving || loading}
                    >
                        {saving ? '保存中...' : '保存する'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EstimateEditModal;
