import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Pencil } from 'lucide-react';
import { Customer } from '../types';
import { fetchCustomers } from '../lib/customers';
import {
    fetchEstimateSummaries, matchesKeyword, formatDate, EstimateSummary,
} from '../lib/estimateQueries';
import EstimateEditModal from './EstimateEditModal';
import { ESTIMATE_STATUS_LABEL } from '../lib/estimateStatus';

interface Props {
    onBack: () => void;
    onOpenEstimate: (id: number) => void;
}

const EstimateSearchPage: React.FC<Props> = ({ onBack, onOpenEstimate }) => {
    const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [editingEstimateId, setEditingEstimateId] = useState<number | null>(null);

    const load = async () => {
        try {
            const [estimateData, customerData] = await Promise.all([
                fetchEstimateSummaries(),
                fetchCustomers(),
            ]);
            setEstimates(estimateData);
            setCustomers(customerData);
        } catch (error) {
            console.error('Failed to fetch estimates:', error);
            alert('見積の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const results = useMemo(
        () => estimates.filter(e => matchesKeyword(e, keyword)),
        [estimates, keyword],
    );

    if (loading) {
        return <div className="fl-shell"><div className="fl-empty">読み込み中...</div></div>;
    }

    return (
        <div className="fl-shell">
            <div className="fl-page">
                <div className="fl-page-head">
                    <button type="button" className="fl-back" onClick={onBack}>
                        <ChevronLeft size={16} />TOP
                    </button>
                    <h2>見積検索</h2>
                </div>

                <input
                    type="text"
                    className="fl-search"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="顧客名・故人名で検索（見積番号・電話番号も可）"
                    autoFocus
                />

                <div className="fl-card">
                    {results.map(estimate => (
                        <div key={estimate.id} className="fl-row">
                            <button
                                type="button"
                                className="fl-row-main"
                                onClick={() => onOpenEstimate(estimate.id)}
                            >
                                <span className="fl-row-title">
                                    {estimate.customerName} 様
                                    <span className={`fl-status is-${estimate.status}`}>
                                        {ESTIMATE_STATUS_LABEL[estimate.status]}
                                    </span>
                                    {!estimate.customerId && <span className="fl-badge">未紐付け</span>}
                                </span>
                                <span className="fl-row-deceased">
                                    {estimate.deceasedName ? `故 ${estimate.deceasedName} 様` : '故人名 未入力'}
                                </span>
                                <span className="fl-row-sub">
                                    見積 #{estimate.id} / {formatDate(estimate.createdAt)}
                                    {estimate.venueName && ` / ${estimate.venueName}`}
                                    {estimate.phone && ` / ${estimate.phone}`}
                                </span>
                            </button>
                            <div className="fl-row-actions">
                                <span className="fl-amount">¥{estimate.totalPrice.toLocaleString()}</span>
                                <button
                                    type="button"
                                    className="fl-icon-btn"
                                    onClick={() => setEditingEstimateId(estimate.id)}
                                    title="顧客情報を編集"
                                >
                                    <Pencil size={14} /> 編集
                                </button>
                            </div>
                        </div>
                    ))}

                    {results.length === 0 && (
                        <div className="fl-empty">
                            {keyword ? '該当する見積が見つかりません' : '見積がまだありません'}
                        </div>
                    )}
                </div>

                <p className="fl-note">最新500件を対象に検索しています。</p>
            </div>

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
        </div>
    );
};

export default EstimateSearchPage;
