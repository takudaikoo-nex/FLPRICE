import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { CatalogProduct, Item, Plan, ProductCategory } from '../types';
import { supabase } from '../lib/supabase';
import { convertDbItem, convertDbPlan } from '../lib/converter';
import {
    PRODUCT_CATEGORIES,
    fetchCatalogProducts,
    resolveOption,
    toProductMap,
} from '../lib/catalogProducts';
import { ITEM_IMAGE_BUCKET, storageImageUrl } from '../lib/storage';
import { formatYen } from '../lib/format';

interface CatalogEntry {
    key: string;
    /** 商品マスタに紐付いている場合の分類 */
    category?: ProductCategory;
    /** 見出し。商品名、またはグレード名 */
    title: string;
    /** どのアイテムで選べるか */
    itemNames: string[];
    description: string;
    /** 集めた金額。同じ商品が複数アイテムで使われていると幅が出る */
    prices: number[];
    images: string[];
}

/** 「50,000円」または「50,000円〜100,000円」 */
const priceRange = (prices: number[]): string | null => {
    const positive = prices.filter(price => price > 0);
    if (positive.length === 0) return null;

    const min = Math.min(...positive);
    const max = Math.max(...positive);
    return min === max ? formatYen(min) : `${formatYen(min)}〜${formatYen(max)}`;
};

/**
 * オプションの画像カタログ。
 * 接客時にお客様へお見せする用途のため、別タブで開く。
 */
const OptionCatalogPage: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [category, setCategory] = useState<ProductCategory | 'all'>('all');
    // 見積画面から開いた場合、そのときのプランで金額を出す（プランごとに金額が変わるため）
    const [planId, setPlanId] = useState<string>(
        () => new URLSearchParams(window.location.search).get('plan') || 'all',
    );
    // 見積画面のモーダルから開いた場合、そのアイテムだけを表示する
    const [focusItemId, setFocusItemId] = useState<number | null>(() => {
        const raw = new URLSearchParams(window.location.search).get('item');
        const parsed = raw ? parseInt(raw, 10) : NaN;
        return isNaN(parsed) ? null : parsed;
    });
    const [loading, setLoading] = useState(true);
    const [zoomed, setZoomed] = useState<CatalogEntry | null>(null);
    const [zoomIndex, setZoomIndex] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const [itemsResult, plansResult, loadedProducts] = await Promise.all([
                    supabase.from('items').select('*').order('display_order', { ascending: true }),
                    supabase.from('plans').select('*').order('display_order', { ascending: true }),
                    fetchCatalogProducts().catch(error => {
                        // 商品マスタが未導入でもカタログは表示する
                        console.error('Failed to load catalog products:', error);
                        return [] as CatalogProduct[];
                    }),
                ]);

                if (itemsResult.error) throw itemsResult.error;
                if (plansResult.error) throw plansResult.error;

                const loadedPlans = (plansResult.data || []).map(convertDbPlan);
                setItems((itemsResult.data || []).map(convertDbItem));
                setPlans(loadedPlans);
                setProducts(loadedProducts);
                // URLで渡されたプランが存在しない場合はすべて表示に戻す
                setPlanId(prev =>
                    prev === 'all' || loadedPlans.some(plan => plan.id === prev) ? prev : 'all',
                );
            } catch (error) {
                console.error('Failed to load catalog:', error);
                alert('カタログの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const productMap = useMemo(() => toProductMap(products), [products]);

    /**
     * 画像を持つアイテム・グレードだけを並べる。
     * 同じ商品に紐付いたグレードは1枚のカードにまとめる。
     */
    const entries = useMemo(() => {
        const result: CatalogEntry[] = [];
        const byKey = new Map<string, CatalogEntry>();

        for (const item of items) {
            if (focusItemId !== null && item.id !== focusItemId) continue;
            if (planId !== 'all' && !item.allowedPlans.includes(planId)) continue;

            if ((item.imagePaths || []).length > 0) {
                result.push({
                    key: `item-${item.id}`,
                    title: item.name,
                    itemNames: [item.name],
                    description: item.description || '',
                    prices: item.basePrice ? [item.basePrice] : [],
                    images: item.imagePaths || [],
                });
            }

            for (const option of item.options || []) {
                if (planId !== 'all' && !option.allowedPlans.includes(planId)) continue;

                const resolved = resolveOption(option, productMap);
                if (resolved.imagePaths.length === 0) continue;

                const price = planId !== 'all'
                    ? (option.planPrices?.[planId] ?? option.price)
                    : option.price;

                // 商品マスタに紐付いていれば商品単位、そうでなければ選択肢ごと
                const key = resolved.product
                    ? `product-${resolved.product.code}`
                    : `opt-${item.id}-${option.id}`;

                const existing = byKey.get(key);
                if (existing) {
                    existing.prices.push(price);
                    if (!existing.itemNames.includes(item.name)) existing.itemNames.push(item.name);
                    continue;
                }

                const entry: CatalogEntry = {
                    key,
                    category: resolved.product?.category,
                    title: resolved.name,
                    itemNames: [item.name],
                    description: resolved.description,
                    prices: [price],
                    images: resolved.imagePaths,
                };
                byKey.set(key, entry);
                result.push(entry);
            }
        }

        return category === 'all' ? result : result.filter(entry => entry.category === category);
    }, [items, planId, focusItemId, productMap, category]);

    /** 分類タブに出す件数。商品に紐付いていないものは「すべて」でのみ見える */
    const categoryCounts = useMemo(() => {
        const counts = new Map<ProductCategory, number>();
        for (const product of products) {
            const used = items.some(item =>
                (item.options || []).some(option => option.productCode === product.code)
            );
            if (!used || product.imagePaths.length === 0) continue;
            counts.set(product.category, (counts.get(product.category) || 0) + 1);
        }
        return counts;
    }, [products, items]);

    const focusedItem = focusItemId !== null
        ? items.find(item => item.id === focusItemId)
        : undefined;

    if (loading) {
        return <div className="fl-shell"><div className="fl-empty">読み込み中...</div></div>;
    }

    return (
        <div className="fl-shell">
            <header className="fl-header">
                <div className="fl-header-left">
                    <h1>{focusedItem ? focusedItem.name : 'オプション画像カタログ'}</h1>
                </div>
                <div className="fl-header-actions">
                    {focusItemId !== null && (
                        <button
                            type="button"
                            className="fl-header-btn"
                            onClick={() => setFocusItemId(null)}
                        >
                            すべてのオプションを見る
                        </button>
                    )}
                    <select
                        value={planId}
                        onChange={e => setPlanId(e.target.value)}
                        className="fl-catalog-filter"
                    >
                        <option value="all">すべてのプラン</option>
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="fl-page">
                {/* 分類での絞り込み。商品マスタに紐付いたものだけ分類を持つ */}
                {categoryCounts.size > 0 && focusItemId === null && (
                    <div className="fl-catalog-tabs">
                        <button
                            type="button"
                            className={category === 'all' ? 'is-active' : ''}
                            onClick={() => setCategory('all')}
                        >
                            すべて
                        </button>
                        {PRODUCT_CATEGORIES.map(definition => {
                            const count = categoryCounts.get(definition.code) || 0;
                            if (count === 0) return null;
                            return (
                                <button
                                    key={definition.code}
                                    type="button"
                                    className={category === definition.code ? 'is-active' : ''}
                                    onClick={() => setCategory(definition.code)}
                                >
                                    {definition.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {entries.length === 0 ? (
                    <div className="fl-empty">
                        画像が登録されているオプションがありません。<br />
                        管理画面の「商品マスタ」から画像を登録してください。
                    </div>
                ) : (
                    <div className="fl-catalog-grid">
                        {entries.map(entry => {
                            const price = priceRange(entry.prices);
                            return (
                                <button
                                    key={entry.key}
                                    type="button"
                                    className="fl-catalog-card"
                                    onClick={() => { setZoomed(entry); setZoomIndex(0); }}
                                >
                                    <img
                                        src={storageImageUrl(ITEM_IMAGE_BUCKET, entry.images[0])}
                                        alt={entry.title}
                                        className="fl-catalog-thumb"
                                    />
                                    <span className="fl-catalog-body">
                                        <span className="fl-catalog-item">{entry.itemNames.join('・')}</span>
                                        <span className="fl-catalog-option">{entry.title}</span>
                                        {price && (
                                            <span className="fl-catalog-price">
                                                {price}<small>税抜</small>
                                            </span>
                                        )}
                                        {entry.images.length > 1 && (
                                            <span className="fl-catalog-count">{entry.images.length}枚</span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <p className="fl-note">
                    ※ 画像はイメージです。実際の商品と異なる場合があります。
                </p>
            </div>

            {zoomed && (
                <div className="fl-lightbox" onClick={() => setZoomed(null)}>
                    <button
                        type="button"
                        className="fl-lightbox-close"
                        onClick={() => setZoomed(null)}
                        aria-label="閉じる"
                    >
                        <X size={28} />
                    </button>

                    <div className="fl-lightbox-inner" onClick={e => e.stopPropagation()}>
                        <img
                            src={storageImageUrl(ITEM_IMAGE_BUCKET, zoomed.images[zoomIndex])}
                            alt={zoomed.title}
                            className="fl-lightbox-image"
                        />

                        {zoomed.images.length > 1 && (
                            <div className="fl-lightbox-thumbs">
                                {zoomed.images.map((path, index) => (
                                    <img
                                        key={path}
                                        src={storageImageUrl(ITEM_IMAGE_BUCKET, path)}
                                        alt=""
                                        className={index === zoomIndex ? 'is-active' : ''}
                                        onClick={() => setZoomIndex(index)}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="fl-lightbox-caption">
                            <strong>{zoomed.title}</strong>
                            <span>{zoomed.itemNames.join('・')}</span>
                            {zoomed.description && (
                                <span className="fl-lightbox-description">{zoomed.description}</span>
                            )}
                            {priceRange(zoomed.prices) && (
                                <span className="fl-catalog-price">
                                    {priceRange(zoomed.prices)}<small>税抜</small>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OptionCatalogPage;
