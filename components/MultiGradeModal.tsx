import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Item, PlanId, MultiGradeSelection, DiscountType } from '../types';
import { MultiGradeInput } from './MultiGradeInput';
import { ProductMap } from '../lib/pricing';

interface MultiGradeModalProps {
    item: Item;
    planId: PlanId;
    selection?: MultiGradeSelection;
    products?: ProductMap;
    onQuantityChange: (gradeId: string, quantity: number) => void;
    onDiscountChange: (discountType: DiscountType, discountValue: number) => void;
    onClose: () => void;
}

/** 数量入力型（供花など）の入力をモーダルで開く。見積画面の行は合計金額だけを出す */
export const MultiGradeModal: React.FC<MultiGradeModalProps> = ({
    item, planId, selection, products, onQuantityChange, onDiscountChange, onClose,
}) => {
    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity no-print"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">グレードごとに個数を入力してください</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto">
                    <MultiGradeInput
                        item={item}
                        planId={planId}
                        selection={selection}
                        products={products}
                        onQuantityChange={onQuantityChange}
                        onDiscountChange={onDiscountChange}
                    />
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm font-bold"
                    >
                        完了
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default MultiGradeModal;
