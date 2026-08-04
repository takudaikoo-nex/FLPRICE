import React from 'react';
import { Pencil } from 'lucide-react';
import { Item, PlanId, MultiGradeSelection } from '../types';
import { getMultiGradeLabel, getMultiGradeSubtotal, getMultiGradeTotal } from '../lib/pricing';

interface MultiGradeButtonProps {
    item: Item;
    planId: PlanId;
    selection?: MultiGradeSelection;
    onClick: () => void;
    className?: string;
}

/** 数量入力型の合計を出すボタン。押すと入力モーダルが開く */
export const MultiGradeButton: React.FC<MultiGradeButtonProps> = ({
    item, planId, selection, onClick, className,
}) => {
    const hasInput = getMultiGradeSubtotal(item, planId, selection) > 0;
    const total = getMultiGradeTotal(item, planId, selection);
    const label = getMultiGradeLabel(item, selection);

    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-3 p-2.5 border rounded-lg bg-white transition-all text-left hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none ${
                hasInput ? 'border-emerald-300' : 'border-gray-300'
            } ${className || ''}`}
        >
            <Pencil size={15} className="text-gray-400 shrink-0" />
            <span className={`flex-1 text-sm truncate ${hasInput ? 'text-gray-600' : 'text-gray-400'}`}>
                {hasInput ? label : '数量を入力'}
            </span>
            <span className={`font-mono font-bold shrink-0 ${hasInput ? 'text-emerald-700' : 'text-gray-400'}`}>
                ¥{total.toLocaleString()}
            </span>
        </button>
    );
};

export default MultiGradeButton;
