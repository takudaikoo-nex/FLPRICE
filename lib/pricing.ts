import { Plan } from '../types';

/** 税率 */
export const TAX_RATE = 0.10;

/**
 * 合計金額を計算（プラン税込 + オプション合計）
 */
export const calculateTotal = (
    plan: Plan,
    optionValues: Map<number, number>,
): number => {
    let total = plan.price; // 税込

    for (const [_itemId, value] of optionValues) {
        total += value;
    }

    return total;
};
