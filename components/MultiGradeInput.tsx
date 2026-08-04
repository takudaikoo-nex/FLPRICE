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
        <div className="w-full">
            <div className="space-y-2">
                {options.map(opt => {
                    const unitPrice = getGradePrice(item, planId, opt.id);
                    const quantity = current.quantities[opt.id] ?? 0;
                    return (
                        <div key={opt.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                quantity > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate">{opt.name}</div>
                                <div className="text-sm text-gray-500 font-mono">¥{unitPrice.toLocaleString()}</div>
                            </div>
                            <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={quantity === 0 ? '' : quantity}
                                placeholder="0"
                                onChange={e => onQuantityChange(opt.id, Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 p-3 border border-gray-300 rounded-lg text-right text-lg font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                            <span className="text-sm text-gray-400 w-4">個</span>
                            <span className={`w-28 text-right font-mono ${quantity > 0 ? 'text-gray-800 font-bold' : 'text-gray-300'}`}>
                                ¥{(unitPrice * quantity).toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-3">
                <div className="flex items-center justify-between text-gray-600">
                    <span className="font-medium">小計</span>
                    <span className="font-mono text-lg">¥{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-600">割引</span>
                    <select
                        value={current.discountType}
                        onChange={e => onDiscountChange(e.target.value as DiscountType, current.discountValue)}
                        className="p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="none">なし</option>
                        <option value="amount">金額</option>
                        <option value="percent">％</option>
                    </select>
                    {current.discountType !== 'none' && (
                        <div className="flex items-center gap-1.5">
                            {current.discountType === 'amount' && <span className="text-gray-500">¥</span>}
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
                                className="w-28 p-2.5 border border-gray-300 rounded-lg text-right font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                            {current.discountType === 'percent' && <span className="text-gray-500">%</span>}
                        </div>
                    )}
                    <span className="ml-auto font-mono text-red-600">
                        {discount > 0 ? `-¥${discount.toLocaleString()}` : ''}
                    </span>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                    <span className="font-bold text-gray-800">合計</span>
                    <span className="font-mono font-bold text-2xl text-emerald-700">¥{(subtotal - discount).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default MultiGradeInput;
