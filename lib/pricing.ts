import { Item, PlanId } from '../types';

export const TAX_RATE = 0.10;
export const NON_TAXABLE_NAMES = ['火葬料金', '控室料金', '斎場料金'];

/** アイテムの価格を取得（プランに含まれる場合は0） */
export const getItemPrice = (
    item: Item,
    planId: PlanId,
    selectedOptions: Set<number>,
    selectedGrades: Map<number, string>,
    freeInputValues: Map<number, number>,
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
): boolean => {
    if (item.includedInPlans.includes(planId)) return true;
    if (item.type === 'checkbox') return selectedOptions.has(item.id);
    if (item.type === 'dropdown') return selectedGrades.has(item.id);
    if (item.type === 'free_input') return (freeInputValues.get(item.id) ?? 0) > 0;
    return false;
};
