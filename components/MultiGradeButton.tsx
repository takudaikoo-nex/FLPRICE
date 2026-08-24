import React from 'react';
import { Pencil } from 'lucide-react';
import { Item, PlanId, MultiGradeSelection } from '../types';
import { getMultiGradeLabel, getMultiGradeSubtotal, getMultiGradeTotal, ProductMap } from '../lib/pricing';

interface MultiGradeButtonProps {
    item: Item;
    planId: PlanId;
    selection?: MultiGradeSelection;
    products?: ProductMap;
    onClick: () => void;
    className?: string;
}

/** 数量入力型の合計を出すボタン。押すと入力モーダルが開く */
export const MultiGradeButton: React.FC<MultiGradeButtonProps> = ({
    item, planId, selection, products, onClick, className,
}) => {
    const hasInput = getMultiGradeSubtotal(item, planId, selection) > 0;
    const total = getMultiGradeTotal(item, planId, selection);
    const label = getMultiGradeLabel(item, selection, products);

    return (
        <button
            type="button"
            onClick={onClick}
            className={`fl-qty-btn ${hasInput ? 'is-filled' : ''} ${className || ''}`}
        >
            <span className="fl-qty-btn-icon"><Pencil size={14} /></span>
            <span className="fl-qty-btn-label">{hasInput ? label : '数量を入力'}</span>
            <span className="fl-qty-btn-total">¥{total.toLocaleString()}</span>
        </button>
    );
};

export default MultiGradeButton;
