import { ItemType } from '../../types';

/** アイテム種別の表示名（管理画面の一覧・編集で共有する） */
export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
    checkbox: 'チェックボックス',
    dropdown: 'プルダウン',
    multi_grade: '数量入力',
    free_input: '手入力',
};

/** 種別ごとの補足。編集画面で挙動を説明する */
export const ITEM_TYPE_HINT: Record<ItemType, string> = {
    checkbox: '追加するかどうかを選びます。金額はベース金額を使います。',
    dropdown: '選択肢から1つだけ選びます。金額は選んだ選択肢の金額です。',
    multi_grade: 'グレードごとに個数を入力して金額を計算します。見積画面で金額または％の割引も入力できます。',
    free_input: '見積画面で金額を直接入力します。',
};

/** 選択肢（グレード）を持つ種別か */
export const hasOptions = (type: ItemType) => type === 'dropdown' || type === 'multi_grade';
