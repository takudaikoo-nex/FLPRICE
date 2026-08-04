import React from 'react';
import { Item, PlanId, MultiGradeSelection, DiscountType } from '../types';
import { emptyMultiGrade, getGradePrice, getMultiGradeSubtotal, getMultiGradeDiscount } from '../lib/pricing';

interface MultiGradeInputProps {
    item: Item;
    planId: PlanId;
    selection?: MultiGradeSelection;
    onQuantityChange: (gradeId: string, quantity: number) => void;
    onDiscountChange: (discountType: DiscountType, discountValue: number) => void;
}

/** グレードごとに個数を入れて金額を出す入力欄（供花など）。割引も指定できる */
export const MultiGradeInput: React.FC<MultiGradeInputProps> = ({
    item, planId, selection, onQuantityChange, onDiscountChange,
}) => {
    const current = selection ?? emptyMultiGrade();
    const options = (item.options || []).filter(o => o.allowedPlans.includes(planId));
    const subtotal = getMultiGradeSubtotal(item, planId, current);
    const discount = getMultiGradeDiscount(item, planId, current);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 w-full sm:min-w-[340px]">
            <div className="space-y-1.5">
                {options.map(opt => {
                    const unitPrice = getGradePrice(item, planId, opt.id);
                    const quantity = current.quantities[opt.id] ?? 0;
                    return (
                        <div key={opt.id} className="flex items-center gap-2 text-sm">
                            <span className="flex-1 font-medium text-gray-700 truncate">{opt.name}</span>
                            <span className="text-xs text-gray-500 font-mono w-20 text-right">¥{unitPrice.toLocaleString()}</span>
                            <input
                                type="number"
                                min={0}
                                value={quantity === 0 ? '' : quantity}
                                placeholder="0"
                                onChange={e => onQuantityChange(opt.id, Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-16 p-1.5 border border-gray-300 rounded text-right font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                            <span className="text-xs text-gray-400 w-4">個</span>
                            <span className={`w-24 text-right font-mono ${quantity > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                ¥{(unitPrice * quantity).toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-gray-200 mt-2.5 pt-2.5 space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                    <span className="font-medium">小計</span>
                    <span className="font-mono">¥{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">割引</span>
                    <select
                        value={current.discountType}
                        onChange={e => onDiscountChange(e.target.value as DiscountType, current.discountValue)}
                        className="p-1.5 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="none">なし</option>
                        <option value="amount">金額</option>
                        <option value="percent">％</option>
                    </select>
                    {current.discountType !== 'none' && (
                        <div className="flex items-center gap-1">
                            {current.discountType === 'amount' && <span className="text-gray-500">¥</span>}
                            <input
                                type="number"
                                min={0}
                                max={current.discountType === 'percent' ? 100 : undefined}
                                value={current.discountValue === 0 ? '' : current.discountValue}
                                placeholder="0"
                                onChange={e => {
                                    const raw = Math.max(0, parseInt(e.target.value) || 0);
                                    onDiscountChange(current.discountType, current.discountType === 'percent' ? Math.min(100, raw) : raw);
                                }}
                                className="w-24 p-1.5 border border-gray-300 rounded text-right font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                            {current.discountType === 'percent' && <span className="text-gray-500">%</span>}
                        </div>
                    )}
                    <span className="ml-auto font-mono text-red-600">
                        {discount > 0 ? `-¥${discount.toLocaleString()}` : ''}
                    </span>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-800">
                    <span>合計</span>
                    <span className="font-mono text-base">¥{(subtotal - discount).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default MultiGradeInput;
