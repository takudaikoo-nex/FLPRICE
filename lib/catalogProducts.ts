import { supabase } from './supabase';
import { CatalogProduct, DropdownOption, Item, ProductCategory } from '../types';

/**
 * オプション商品マスタの取り扱い。
 * 要件は docs/requirements-product-catalog.md を参照。
 */

export interface CategoryDefinition {
    code: ProductCategory;
    label: string;
    /** 新規採番のプレフィックス。既存の BC/FO/YW はそのまま残すため例外扱い */
    prefix: string;
}

/** 分類の一覧。表示順もこの順番 */
export const PRODUCT_CATEGORIES: CategoryDefinition[] = [
    { code: 'ALTAR', label: '祭壇', prefix: 'AL' },
    { code: 'AFTER', label: '後飾り祭壇', prefix: 'DA' },
    { code: 'URN', label: '骨壺・骨箱', prefix: 'UR' },
    { code: 'URNCOVER', label: '骨壺覆い', prefix: 'UC' },
    { code: 'FLOWER', label: '供花', prefix: 'YW' },
    { code: 'PHOTO', label: '遺影の額', prefix: 'PF' },
    { code: 'COFFIN', label: 'お棺・仏衣', prefix: 'CF' },
    { code: 'OTHER', label: 'その他', prefix: 'OT' },
];

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> =
    PRODUCT_CATEGORIES.reduce((acc, c) => {
        acc[c.code] = c.label;
        return acc;
    }, {} as Record<ProductCategory, string>);

export const convertDbProduct = (row: any): CatalogProduct => ({
    code: row.code,
    category: row.category || 'OTHER',
    name: row.name || '',
    description: row.description || '',
    imagePaths: row.image_paths || [],
    displayOrder: row.display_order ?? 0,
    isActive: row.is_active ?? true,
});

export const convertProductToDb = (product: CatalogProduct): Record<string, any> => ({
    code: product.code,
    category: product.category,
    name: product.name,
    description: product.description,
    image_paths: product.imagePaths || [],
    display_order: product.displayOrder,
    is_active: product.isActive,
});

export const fetchCatalogProducts = async (): Promise<CatalogProduct[]> => {
    const { data, error } = await supabase
        .from('catalog_products')
        .select('*')
        .order('category')
        .order('display_order');

    if (error) throw error;
    return (data || []).map(convertDbProduct);
};

/** コードで引ける形にする */
export const toProductMap = (products: CatalogProduct[]): Map<string, CatalogProduct> =>
    new Map(products.map(p => [p.code, p]));

/**
 * 分類の次の連番コードを提案する。
 * 既存が UR-01, UR-02 なら UR-03 を返す。BC/FO のような例外コードは採番に使わない。
 */
export const nextProductCode = (
    products: CatalogProduct[],
    category: ProductCategory,
): string => {
    const prefix = PRODUCT_CATEGORIES.find(c => c.code === category)?.prefix || 'OT';
    const pattern = new RegExp(`^${prefix}-(\\d+)$`);

    const maxNumber = products.reduce((max, product) => {
        const matched = product.code.match(pattern);
        return matched ? Math.max(max, parseInt(matched[1], 10)) : max;
    }, 0);

    // 供花の YW-1 のような1桁運用に合わせ、既存が2桁未満なら桁を増やさない
    const next = maxNumber + 1;
    const width = products.some(p => pattern.test(p.code) && p.code.split('-')[1].length === 1)
        ? 1
        : 2;
    return `${prefix}-${String(next).padStart(width, '0')}`;
};

/**
 * 画面に出す名前・説明・画像を決める。
 * マスタに紐付いていればマスタを正とし、無ければ従来どおり選択肢側を使う。
 */
export const resolveOption = (
    option: DropdownOption,
    products: Map<string, CatalogProduct>,
) => {
    const product = option.productCode ? products.get(option.productCode) : undefined;

    return {
        product,
        name: product ? (product.name || product.code) : option.name,
        description: product?.description || '',
        imagePaths: product ? product.imagePaths : (option.imagePaths || []),
        /** 画面に出すコード。マスタ紐付け時のみ */
        code: product?.code,
    };
};

/** そのアイテムの画像（本体＋選択肢）が1枚でもあるか */
export const hasAnyImage = (item: Item, products: Map<string, CatalogProduct>): boolean =>
    (item.imagePaths || []).length > 0 ||
    (item.options || []).some(option => resolveOption(option, products).imagePaths.length > 0);

/** その商品を使っているアイテムを探す（削除前の影響確認に使う） */
export const findItemsUsingProduct = (items: Item[], code: string): Item[] =>
    items.filter(item => (item.options || []).some(option => option.productCode === code));
