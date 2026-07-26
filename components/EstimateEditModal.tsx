import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { supabase } from '../lib/supabase';
import { linkEstimateToCustomer, updateEstimateCustomerInfo } from '../lib/customers';

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
}

const EstimateEditModal: React.FC<Props> = ({ estimateId, customers, onClose, onSaved }) => {
    const [info, setInfo] = useState<EditableInfo>({
        deceasedName: '', applicantName: '', chiefMournerName: '', applicantPhone: '', funeralDate: '',
    });
    const [customerId, setCustomerId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('estimates')
                    .select('customer_info, customer_id')
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
                });
                setCustomerId(data.customer_id || '');
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

                        <div className="fl-field">
                            <label htmlFor="e-phone">電話番号</label>
                            <input
                                id="e-phone"
                                type="tel"
                                value={info.applicantPhone}
                                onChange={e => update({ applicantPhone: e.target.value })}
                            />
                        </div>

                        <p className="fl-note">
                            ここでの変更は見積を呼び出したときの入力内容にも反映されます。プランやオプションの変更は見積画面で行ってください。
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
