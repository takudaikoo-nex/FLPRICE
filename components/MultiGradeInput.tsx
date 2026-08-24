import React from 'react';
import { Item, PlanId, MultiGradeSelection, DiscountType } from '../types';
import { emptyMultiGrade, getGradePrice, getMultiGradeSubtotal, getMultiGradeDiscount, gradeName, ProductMap } from '../lib/pricing';

interface MultiGradeInputProps {
    item: Item;
    planId: PlanId;
    selection?: MultiGradeSelection;
    products?: ProductMap;
    onQuantityChange: (gradeId: string, quantity: number) => void;
    onDiscountChange: (discountType: DiscountType, discountValue: number) => void;
}

/** グレードごとに個数を入れて金額を出す入力欄（供花など）。割引も指定できる */
export const MultiGradeInput: React.FC<MultiGradeInputProps> = ({
    item, planId, selection, products, onQuantityChange, onDiscountChange,
}) => {
    const current = selection ?? emptyMultiGrade();
    const options = (item.options || []).filter(o => o.allowedPlans.includes(planId));
    const subtotal = getMultiGradeSubtotal(item, planId, current);
    const discount = getMultiGradeDiscount(item, planId, current);

    return (
        <div>
            <div className="fl-qty-list">
                {options.map(opt => {
                    const unitPrice = getGradePrice(item, planId, opt.id);
                    const quantity = current.quantities[opt.id] ?? 0;
                    return (
                        <div key={opt.id} className={`fl-qty-row ${quantity > 0 ? 'is-filled' : ''}`}>
                            <div className="fl-qty-row-main">
                                <div className="fl-qty-row-name">{gradeName(opt, products)}</div>
                                <div className="fl-qty-row-unit">¥{unitPrice.toLocaleString()}</div>
                            </div>
                            <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={quantity === 0 ? '' : quantity}
                                placeholder="0"
                                onChange={e => onQuantityChange(opt.id, Math.max(0, parseInt(e.target.value) || 0))}
                                className="fl-qty-input"
                            />
                            <span className="fl-qty-suffix">個</span>
                            <span className="fl-qty-amount">¥{(unitPrice * quantity).toLocaleString()}</span>
                        </div>
                    );
                })}
            </div>

            <div className="fl-qty-foot">
                <div className="fl-qty-line">
                    <span>小計</span>
                    <span className="fl-qty-line-value">¥{subtotal.toLocaleString()}</span>
                </div>

                <div className="fl-qty-discount">
                    <span>割引</span>
                    <select
                        value={current.discountType}
                        onChange={e => onDiscountChange(e.target.value as DiscountType, current.discountValue)}
                    >
                        <option value="none">なし</option>
                        <option value="amount">金額</option>
                        <option value="percent">％</option>
                    </select>
                    {current.discountType !== 'none' && (
                        <>
                            {current.discountType === 'amount' && <span>¥</span>}
                            <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                max={current.discountType === 'percent' ? 100 : undefined}
                                value={current.discountValue === 0 ? '' : current.discountValue}
                                placeholder="0"
                                onChange={e => {
                                    const raw = Math.max(0, parseInt(e.target.value) || 0);
                                    onDiscountChange(current.discountType, current.discountType === 'percent' ? Math.min(100, raw) : raw);
                                }}
                            />
                            {current.discountType === 'percent' && <span>%</span>}
                        </>
                    )}
                    <span className="fl-qty-discount-value">
                        {discount > 0 ? `-¥${discount.toLocaleString()}` : ''}
                    </span>
                </div>

                <div className="fl-qty-total">
                    <span className="fl-qty-total-label">合計</span>
                    <span className="fl-qty-total-value">¥{(subtotal - discount).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default MultiGradeInput;
