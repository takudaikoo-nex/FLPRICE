import React, { useState } from 'react';
import { stripHonorific } from '../lib/format';
import { Download } from 'lucide-react';
import { Customer } from '../types';
import { CustomerInput, emptyCustomerInput, createCustomer, updateCustomer } from '../lib/customers';
import { EstimateSummary } from '../lib/estimateQueries';

interface Props {
    /** 未指定なら新規作成 */
    customer?: Customer | null;
    /** この顧客の最新の見積。連絡先を取り込むために使う */
    sourceEstimate?: EstimateSummary | null;
    onClose: () => void;
    onSaved: (customerId: string) => void;
}

const toInput = (customer?: Customer | null): CustomerInput => customer
    ? {
        name: customer.name,
        kana: customer.kana,
        phone: customer.phone,
        postal_code: customer.postal_code,
        address: customer.address,
        note: customer.note,
    }
    : emptyCustomerInput();

const CustomerFormModal: React.FC<Props> = ({ customer, sourceEstimate, onClose, onSaved }) => {
    const [form, setForm] = useState<CustomerInput>(toInput(customer));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const update = (patch: Partial<CustomerInput>) => setForm({ ...form, ...patch });

    /** 見積に入力済みの申込者情報を顧客情報に取り込む */
    const importFromEstimate = () => {
        if (!sourceEstimate) return;
        setForm({
            ...form,
            name: stripHonorific(form.name) || sourceEstimate.customerName,
            phone: sourceEstimate.phone || form.phone,
            postal_code: sourceEstimate.postalCode || form.postal_code,
            address: sourceEstimate.address || form.address,
        });
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setError('顧客名を入力してください。');
            return;
        }

        setSaving(true);
        setError('');
        try {
            if (customer) {
                await updateCustomer(customer.id, form);
                onSaved(customer.id);
            } else {
                const created = await createCustomer(form);
                onSaved(created.id);
            }
        } catch (e: any) {
            console.error('Failed to save customer:', e);
            setError(`保存に失敗しました: ${e.message || e}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fl-modal-backdrop" onClick={onClose}>
            <div className="fl-modal" onClick={e => e.stopPropagation()}>
                <h3>{customer ? '顧客情報を編集' : '顧客を追加'}</h3>

                {sourceEstimate && (
                    <div className="fl-import-row">
                        <span>
                            見積 #{sourceEstimate.id} に連絡先が入力されています
                        </span>
                        <button type="button" className="fl-icon-btn" onClick={importFromEstimate}>
                            <Download size={14} /> 見積から取り込む
                        </button>
                    </div>
                )}

                <div className="fl-grid-2">
                    <div className="fl-field">
                        <label htmlFor="c-name">顧客名（ご葬家名）</label>
                        <input
                            id="c-name"
                            type="text"
                            value={form.name}
                            onChange={e => update({ name: e.target.value })}
                            onBlur={e => update({ name: stripHonorific(e.target.value) })}
                            autoFocus
                        />
                    </div>
                    <div className="fl-field">
                        <label htmlFor="c-kana">ふりがな</label>
                        <input
                            id="c-kana"
                            type="text"
                            value={form.kana}
                            onChange={e => update({ kana: e.target.value })}
                        />
                    </div>
                </div>

                <div className="fl-grid-2">
                    <div className="fl-field">
                        <label htmlFor="c-phone">電話番号</label>
                        <input
                            id="c-phone"
                            type="tel"
                            value={form.phone}
                            onChange={e => update({ phone: e.target.value })}
                        />
                    </div>
                    <div className="fl-field">
                        <label htmlFor="c-postal">郵便番号</label>
                        <input
                            id="c-postal"
                            type="text"
                            value={form.postal_code}
                            onChange={e => update({ postal_code: e.target.value })}
                        />
                    </div>
                </div>

                <div className="fl-field">
                    <label htmlFor="c-address">住所</label>
                    <input
                        id="c-address"
                        type="text"
                        value={form.address}
                        onChange={e => update({ address: e.target.value })}
                    />
                </div>

                <div className="fl-field">
                    <label htmlFor="c-note">メモ</label>
                    <textarea
                        id="c-note"
                        value={form.note}
                        onChange={e => update({ note: e.target.value })}
                    />
                </div>

                {error && <p className="fl-error">{error}</p>}

                <div className="fl-actions">
                    <button type="button" className="fl-btn fl-btn-ghost" onClick={onClose} disabled={saving}>
                        キャンセル
                    </button>
                    <button type="button" className="fl-btn fl-btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? '保存中...' : '保存する'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerFormModal;
