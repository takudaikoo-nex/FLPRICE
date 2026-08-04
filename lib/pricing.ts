import { Item, PlanId, MultiGradeSelection } from '../types';

export const TAX_RATE = 0.10;
export const REDUCED_TAX_RATE = 0.08;
export const NON_TAXABLE_NAMES = ['火葬料金', '控室料金', '斎場料金'];

/** 数量入力型の初期値 */
export const emptyMultiGrade = (): MultiGradeSelection => ({
    quantities: {}, discountType: 'none', discountValue: 0,
});

/** グレードの単価（プランごとの価格があればそちら） */
export const getGradePrice = (
    item: Item, planId: PlanId, gradeId: string,
): number => {
    const opt = item.options?.find(o => o.id === gradeId);
    if (!opt) return 0;
    return opt.planPrices?.[planId] ?? opt.price;
};

/** 数量入力型の割引前小計 */
export const getMultiGradeSubtotal = (
    item: Item, planId: PlanId, selection?: MultiGradeSelection,
): number => {
    if (!selection || !item.options) return 0;
    return item.options.reduce((sum, opt) => {
        const qty = selection.quantities[opt.id] ?? 0;
        if (qty <= 0) return sum;
        return sum + (opt.planPrices?.[planId] ?? opt.price) * qty;
    }, 0);
};

/** 数量入力型の割引額（正の数。小計を超えることはない） */
export const getMultiGradeDiscount = (
    item: Item, planId: PlanId, selection?: MultiGradeSelection,
): number => {
    if (!selection || selection.discountType === 'none') return 0;
    const subtotal = getMultiGradeSubtotal(item, planId, selection);
    if (subtotal <= 0 || selection.discountValue <= 0) return 0;
    const discount = selection.discountType === 'percent'
        ? Math.floor(subtotal * selection.discountValue / 100)
        : selection.discountValue;
    return Math.min(discount, subtotal);
};

/** 数量入力型の割引後の金額 */
export const getMultiGradeTotal = (
    item: Item, planId: PlanId, selection?: MultiGradeSelection,
): number => getMultiGradeSubtotal(item, planId, selection) - getMultiGradeDiscount(item, planId, selection);

/** 数量入力型の内訳ラベル（例: YW-3×2, YW-2×1） */
export const getMultiGradeLabel = (
    item: Item, selection?: MultiGradeSelection,
): string => {
    if (!selection || !item.options) return '';
    return item.options
        .filter(opt => (selection.quantities[opt.id] ?? 0) > 0)
        .map(opt => `${opt.name}×${selection.quantities[opt.id]}`)
        .join(', ');
};

/** 割引の表示ラベル（例: 割引 -¥5,000 / 割引 10%） */
export const getDiscountLabel = (
    item: Item, planId: PlanId, selection?: MultiGradeSelection,
): string => {
    const discount = getMultiGradeDiscount(item, planId, selection);
    if (discount <= 0) return '';
    return selection?.discountType === 'percent'
        ? `割引 ${selection.discountValue}% (-¥${discount.toLocaleString()})`
        : `割引 -¥${discount.toLocaleString()}`;
};

/** 帳票の明細に添える内訳（ドロップダウンはグレード名、数量入力型は個数と割引） */
export const getItemDetailLabel = (
    item: Item,
    planId: PlanId,
    selectedGrades: Map<number, string>,
    multiGradeValues?: Map<number, MultiGradeSelection>,
): string => {
    if (item.type === 'multi_grade') {
        const selection = multiGradeValues?.get(item.id);
        return [getMultiGradeLabel(item, selection), getDiscountLabel(item, planId, selection)]
            .filter(Boolean).join(' / ');
    }
    const gradeId = selectedGrades.get(item.id);
    if (gradeId && item.options) return item.options.find(o => o.id === gradeId)?.name || '';
    return '';
};

/** アイテムの価格を取得（プランに含まれる場合は0） */
export const getItemPrice = (
    item: Item,
    planId: PlanId,
    selectedOptions: Set<number>,
    selectedGrades: Map<number, string>,
    freeInputValues: Map<number, number>,
    multiGradeValues?: Map<number, MultiGradeSelection>,
): number => {
    // プランに含まれる場合は無料
    if (item.includedInPlans.includes(planId)) {
        // ただしドロップダウンのアップグレードは別途加算
        if (item.type === 'dropdown') {
            const gradeId = selectedGrades.get(item.id);
            if (gradeId && item.options) {
                const opt = item.options.find(o => o.id === gradeId);
                if (opt) return opt.planPrices?.[planId] ?? opt.price;
            }
        }
        return 0;
    }

    // チェックボックス
    if (item.type === 'checkbox') {
        return selectedOptions.has(item.id) ? (item.basePrice ?? 0) : 0;
    }

    // ドロップダウン
    if (item.type === 'dropdown') {
        const gradeId = selectedGrades.get(item.id);
        if (gradeId && item.options) {
            const opt = item.options.find(o => o.id === gradeId);
            if (opt) return opt.planPrices?.[planId] ?? opt.price;
        }
        return 0;
    }

    // 数量入力（グレードごとの個数 − 割引）
    if (item.type === 'multi_grade') {
        const selection = multiGradeValues?.get(item.id);
        return getMultiGradeSubtotal(item, planId, selection) - getMultiGradeDiscount(item, planId, selection);
    }

    // 自由入力
    if (item.type === 'free_input') {
        return freeInputValues.get(item.id) ?? 0;
    }

    return 0;
};

/** アイテムが選択されているか判定 */
export const isItemActive = (
    item: Item,
    planId: PlanId,
    selectedOptions: Set<number>,
    selectedGrades: Map<number, string>,
    freeInputValues: Map<number, number>,
    multiGradeValues?: Map<number, MultiGradeSelection>,
): boolean => {
    if (item.includedInPlans.includes(planId)) return true;
    if (item.type === 'checkbox') return selectedOptions.has(item.id);
    if (item.type === 'dropdown') return selectedGrades.has(item.id);
    if (item.type === 'multi_grade') return getMultiGradeSubtotal(item, planId, multiGradeValues?.get(item.id)) > 0;
    if (item.type === 'free_input') return (freeInputValues.get(item.id) ?? 0) !== 0;
    return false;
};
