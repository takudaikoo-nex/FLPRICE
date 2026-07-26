import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { Customer } from '../types';
import { fetchCustomers, deleteCustomer } from '../lib/customers';
import {
    fetchEstimateSummaries, matchesKeyword, formatDate, EstimateSummary,
} from '../lib/estimateQueries';
import CustomerFormModal from './CustomerFormModal';
import EstimateEditModal from './EstimateEditModal';

interface Props {
    onBack: () => void;
    onOpenEstimate: (id: number) => void;
}

const CustomerListPage: React.FC<Props> = ({ onBack, onOpenEstimate }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showUnlinked, setShowUnlinked] = useState(false);

    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [editingEstimateId, setEditingEstimateId] = useState<number | null>(null);

    const load = async () => {
        try {
            const [customerData, estimateData] = await Promise.all([
                fetchCustomers(),
                fetchEstimateSummaries(),
            ]);
            setCustomers(customerData);
            setEstimates(estimateData);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            alert('顧客情報の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const estimatesByCustomer = useMemo(() => {
        const map = new Map<string, EstimateSummary[]>();
        for (const estimate of estimates) {
            if (!estimate.customerId) continue;
            const list = map.get(estimate.customerId);
            if (list) list.push(estimate);
            else map.set(estimate.customerId, [estimate]);
        }
        return map;
    }, [estimates]);

    const unlinkedEstimates = useMemo(
        () => estimates.filter(e => !e.customerId),
        [estimates],
    );

    const visibleCustomers = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return customers;

        return customers.filter(customer => {
            const own = [customer.name, customer.kana, customer.phone, customer.customer_no]
                .some(value => (value || '').toLowerCase().includes(q));
            if (own) return true;

            return (estimatesByCustomer.get(customer.id) || []).some(e => matchesKeyword(e, keyword));
        });
    }, [customers, keyword, estimatesByCustomer]);

    const selected = selectedId ? customers.find(c => c.id === selectedId) ?? null : null;

    const handleDelete = async (customer: Customer) => {
        if (!confirm(`「${customer.name}」を削除しますか？この操作は取り消せません。`)) return;

        try {
            await deleteCustomer(customer.id);
            await load();
        } catch (error: any) {
            alert(error.message || '削除に失敗しました');
        }
    };

    const closeCustomerForm = () => {
        setShowCustomerForm(false);
        setEditingCustomer(null);
    };

    if (loading) {
        return <div className="fl-shell"><div className="fl-empty">読み込み中...</div></div>;
    }

    const modals = (
        <>
            {showCustomerForm && (
                <CustomerFormModal
                    customer={editingCustomer}
                    onClose={closeCustomerForm}
                    onSaved={async customerId => {
                        closeCustomerForm();
                        await load();
                        if (!editingCustomer) setSelectedId(customerId);
                    }}
                />
            )}

            {editingEstimateId !== null && (
                <EstimateEditModal
                    estimateId={editingEstimateId}
                    customers={customers}
                    onClose={() => setEditingEstimateId(null)}
                    onSaved={async () => {
                        setEditingEstimateId(null);
                        await load();
                    }}
                />
            )}
        </>
    );

    // --- 未紐付けの見積 ---
    if (showUnlinked) {
        return (
            <div className="fl-shell">
                <div className="fl-page">
                    <div className="fl-page-head">
                        <button type="button" className="fl-back" onClick={() => setShowUnlinked(false)}>
                            <ChevronLeft size={16} />顧客一覧
                        </button>
                        <h2>未紐付けの見積</h2>
                    </div>

                    <div className="fl-card">
                        {unlinkedEstimates.map(estimate => (
                            <div key={estimate.id} className="fl-row">
                                <button
                                    type="button"
                                    className="fl-row-main"
                                    onClick={() => onOpenEstimate(estimate.id)}
                                >
                                    <span className="fl-row-title">見積 #{estimate.id}</span>
                                    <span className="fl-row-sub">
                                        {estimate.deceasedName && `故 ${estimate.deceasedName} 様 / `}
                                        {formatDate(estimate.createdAt)}
                                    </span>
                                </button>
                                <div className="fl-row-actions">
                                    <span className="fl-amount">¥{estimate.totalPrice.toLocaleString()}</span>
                                    <button
                                        type="button"
                                        className="fl-icon-btn"
                                        onClick={() => setEditingEstimateId(estimate.id)}
                                    >
                                        顧客に紐付け
                                    </button>
                                </div>
                            </div>
                        ))}

                        {unlinkedEstimates.length === 0 && (
                            <div className="fl-empty">未紐付けの見積はありません</div>
                        )}
                    </div>

                    <p className="fl-note">
                        顧客情報が未入力のまま保存された見積です。「顧客に紐付け」から顧客を選ぶと一覧に表示されます。
                    </p>
                </div>
                {modals}
            </div>
        );
    }

    // --- 顧客詳細 ---
    if (selected) {
        const list = estimatesByCustomer.get(selected.id) || [];

        return (
            <div className="fl-shell">
                <div className="fl-page">
                    <div className="fl-page-head">
                        <button type="button" className="fl-back" onClick={() => setSelectedId(null)}>
                            <ChevronLeft size={16} />顧客一覧
                        </button>
                        <h2>{selected.name} 様</h2>
                    </div>

                    <div className="fl-card" style={{ padding: '16px 18px', marginBottom: 16 }}>
                        <div className="fl-row" style={{ padding: 0, border: 'none' }}>
                            <div className="fl-row-main">
                                <div className="fl-row-sub">{selected.customer_no}</div>
                                {selected.kana && <div className="fl-row-sub">{selected.kana}</div>}
                                {selected.phone && <div className="fl-row-sub">TEL: {selected.phone}</div>}
                                {selected.address && (
                                    <div className="fl-row-sub">
                                        {selected.postal_code && `〒${selected.postal_code} `}{selected.address}
                                    </div>
                                )}
                                {selected.note && <div className="fl-row-sub">メモ: {selected.note}</div>}
                            </div>
                            <div className="fl-row-actions">
                                <button
                                    type="button"
                                    className="fl-icon-btn"
                                    onClick={() => { setEditingCustomer(selected); setShowCustomerForm(true); }}
                                >
                                    <Pencil size={14} /> 顧客情報を編集
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="fl-card">
                        {list.map(estimate => (
                            <div key={estimate.id} className="fl-row">
                                <button
                                    type="button"
                                    className="fl-row-main"
                                    onClick={() => onOpenEstimate(estimate.id)}
                                >
                                    <span className="fl-row-title">見積 #{estimate.id}</span>
                                    <span className="fl-row-sub">
                                        {estimate.deceasedName && `故 ${estimate.deceasedName} 様 / `}
                                        {formatDate(estimate.createdAt)}
                                    </span>
                                </button>
                                <div className="fl-row-actions">
                                    <span className="fl-amount">¥{estimate.totalPrice.toLocaleString()}</span>
                                    <button
                                        type="button"
                                        className="fl-icon-btn"
                                        onClick={() => setEditingEstimateId(estimate.id)}
                                    >
                                        <Pencil size={14} /> 編集
                                    </button>
                                </div>
                            </div>
                        ))}

                        {list.length === 0 && (
                            <div className="fl-empty">この顧客に紐づく見積はまだありません</div>
                        )}
                    </div>
                </div>
                {modals}
            </div>
        );
    }

    // --- 顧客一覧 ---
    return (
        <div className="fl-shell">
            <div className="fl-page">
                <div className="fl-page-head">
                    <button type="button" className="fl-back" onClick={onBack}>
                        <ChevronLeft size={16} />TOP
                    </button>
                    <h2>顧客一覧</h2>
                </div>

                <div className="fl-toolbar">
                    <input
                        type="text"
                        className="fl-search"
                        style={{ marginBottom: 0 }}
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        placeholder="顧客名・ふりがな・電話番号・故人名で絞り込み"
                    />
                    <button
                        type="button"
                        className="fl-btn fl-btn-primary"
                        onClick={() => { setEditingCustomer(null); setShowCustomerForm(true); }}
                    >
                        <Plus size={16} />顧客を追加
                    </button>
                </div>

                <div className="fl-card">
                    {visibleCustomers.map(customer => {
                        const list = estimatesByCustomer.get(customer.id) || [];
                        const total = list.reduce((sum, e) => sum + e.totalPrice, 0);

                        return (
                            <div key={customer.id} className="fl-row">
                                <button
                                    type="button"
                                    className="fl-row-main"
                                    onClick={() => setSelectedId(customer.id)}
                                >
                                    <span className="fl-row-title">
                                        {customer.name} 様
                                        <span className="fl-badge">見積 {list.length}件</span>
                                    </span>
                                    <span className="fl-row-sub">
                                        {customer.customer_no}
                                        {customer.phone && ` / ${customer.phone}`}
                                        {list[0]?.deceasedName && ` / 故 ${list[0].deceasedName} 様`}
                                    </span>
                                </button>
                                <div className="fl-row-actions">
                                    <span className="fl-amount">¥{total.toLocaleString()}</span>
                                    <button
                                        type="button"
                                        className="fl-icon-btn"
                                        onClick={() => { setEditingCustomer(customer); setShowCustomerForm(true); }}
                                        title="顧客情報を編集"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className="fl-icon-btn is-danger"
                                        onClick={() => handleDelete(customer)}
                                        title="削除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {visibleCustomers.length === 0 && (
                        <div className="fl-empty">
                            {keyword ? '該当する顧客が見つかりません' : '顧客がまだ登録されていません'}
                        </div>
                    )}
                </div>

                {unlinkedEstimates.length > 0 && (
                    <div className="fl-card" style={{ marginTop: 16 }}>
                        <div className="fl-row">
                            <button
                                type="button"
                                className="fl-row-main"
                                onClick={() => setShowUnlinked(true)}
                            >
                                <span className="fl-row-title">
                                    未紐付けの見積
                                    <span className="fl-badge">{unlinkedEstimates.length}件</span>
                                </span>
                                <span className="fl-row-sub">顧客情報が未入力のまま保存された見積です</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {modals}
        </div>
    );
};

export default CustomerListPage;
