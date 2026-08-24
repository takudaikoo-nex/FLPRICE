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
        <div className="fl-modal-backdrop no-print" onClick={onClose}>
            <div
                className="fl-modal is-flush animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="fl-modal-head">
                    <div>
                        <h3>{item.name}</h3>
                        <p className="fl-modal-head-sub">グレードごとに個数を入力してください</p>
                    </div>
                    <button type="button" className="fl-modal-close" onClick={onClose} title="閉じる">
                        <X size={20} />
                    </button>
                </div>

                <div className="fl-modal-body">
                    <MultiGradeInput
                        item={item}
                        planId={planId}
                        selection={selection}
                        products={products}
                        onQuantityChange={onQuantityChange}
                        onDiscountChange={onDiscountChange}
                    />
                </div>

                <div className="fl-modal-foot">
                    <button type="button" className="fl-btn fl-btn-primary" onClick={onClose}>
                        完了
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default MultiGradeModal;
