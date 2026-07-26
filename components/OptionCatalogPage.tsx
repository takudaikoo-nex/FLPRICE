import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { Item, Plan } from '../types';
import { supabase } from '../lib/supabase';
import { convertDbItem, convertDbPlan } from '../lib/converter';
import { ITEM_IMAGE_BUCKET, storageImageUrl } from '../lib/storage';
import { formatYen } from '../lib/format';

interface CatalogEntry {
    key: string;
    itemName: string;
    /** グレード名。アイテム本体の画像なら空 */
    optionName: string;
    price: number | null;
    images: string[];
}

/**
 * オプションの画像カタログ。
 * 接客時にお客様へお見せする用途のため、別タブで開く。
 */
const OptionCatalogPage: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [planId, setPlanId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [zoomed, setZoomed] = useState<CatalogEntry | null>(null);
    const [zoomIndex, setZoomIndex] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const [itemsResult, plansResult] = await Promise.all([
                    supabase.from('items').select('*').order('display_order', { ascending: true }),
                    supabase.from('plans').select('*').order('display_order', { ascending: true }),
                ]);

                if (itemsResult.error) throw itemsResult.error;
                if (plansResult.error) throw plansResult.error;

                setItems((itemsResult.data || []).map(convertDbItem));
                setPlans((plansResult.data || []).map(convertDbPlan));
            } catch (error) {
                console.error('Failed to load catalog:', error);
                alert('カタログの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /** 画像を持つアイテム・グレードだけを並べる */
    const entries = useMemo(() => {
        const result: CatalogEntry[] = [];

        for (const item of items) {
            if (planId !== 'all' && !item.allowedPlans.includes(planId)) continue;

            if ((item.imagePaths || []).length > 0) {
                result.push({
                    key: `item-${item.id}`,
                    itemName: item.name,
                    optionName: '',
                    price: item.basePrice ?? null,
                    images: item.imagePaths || [],
                });
            }

            for (const option of item.options || []) {
                if (planId !== 'all' && !option.allowedPlans.includes(planId)) continue;
                if ((option.imagePaths || []).length === 0) continue;

                result.push({
                    key: `opt-${item.id}-${option.id}`,
                    itemName: item.name,
                    optionName: option.name,
                    price: planId !== 'all'
                        ? (option.planPrices?.[planId] ?? option.price)
                        : option.price,
                    images: option.imagePaths || [],
                });
            }
        }

        return result;
    }, [items, planId]);

    if (loading) {
        return <div className="fl-shell"><div className="fl-empty">読み込み中...</div></div>;
    }

    return (
        <div className="fl-shell">
            <header className="fl-header">
                <div className="fl-header-left">
                    <h1>オプション画像カタログ</h1>
                </div>
                <div className="fl-header-actions">
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
                {entries.length === 0 ? (
                    <div className="fl-empty">
                        画像が登録されているオプションがありません。<br />
                        管理画面の「アイテム管理」から画像を登録してください。
                    </div>
                ) : (
                    <div className="fl-catalog-grid">
                        {entries.map(entry => (
                            <button
                                key={entry.key}
                                type="button"
                                className="fl-catalog-card"
                                onClick={() => { setZoomed(entry); setZoomIndex(0); }}
                            >
                                <img
                                    src={storageImageUrl(ITEM_IMAGE_BUCKET, entry.images[0])}
                                    alt={entry.optionName || entry.itemName}
                                    className="fl-catalog-thumb"
                                />
                                <span className="fl-catalog-body">
                                    <span className="fl-catalog-item">{entry.itemName}</span>
                                    {entry.optionName && (
                                        <span className="fl-catalog-option">{entry.optionName}</span>
                                    )}
                                    {entry.price !== null && entry.price > 0 && (
                                        <span className="fl-catalog-price">
                                            {formatYen(entry.price)}<small>税抜</small>
                                        </span>
                                    )}
                                    {entry.images.length > 1 && (
                                        <span className="fl-catalog-count">{entry.images.length}枚</span>
                                    )}
                                </span>
                            </button>
                        ))}
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
                            alt={zoomed.optionName || zoomed.itemName}
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
                            <strong>{zoomed.itemName}</strong>
                            {zoomed.optionName && <span>{zoomed.optionName}</span>}
                            {zoomed.price !== null && zoomed.price > 0 && (
                                <span className="fl-catalog-price">
                                    {formatYen(zoomed.price)}<small>税抜</small>
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
