import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { CatalogProduct, Item, ProductCategory } from '../../types';
import { convertDbItem } from '../../lib/converter';
import {
    PRODUCT_CATEGORIES,
    PRODUCT_CATEGORY_LABEL,
    convertProductToDb,
    fetchCatalogProducts,
    nextProductCode,
} from '../../lib/catalogProducts';
import { ITEM_IMAGE_BUCKET, storageImageUrl, uploadImages, removeImages } from '../../lib/storage';
import { Plus, Edit, Trash2, Copy, ArrowUp, ArrowDown, ImagePlus, X, EyeOff, Link2 } from 'lucide-react';

/** 商品マスタに紐付いていない選択肢の位置 */
interface OptionRef {
    itemId: number;
    itemName: string;
    optionId: string;
    optionName: string;
    imagePaths: string[];
}

/** 同じ名前の選択肢はまとめて割り当てられるようにする */
interface UnassignedGroup {
    name: string;
    refs: OptionRef[];
    imagePaths: string[];
}

type TabKey = ProductCategory | 'ALL' | 'UNASSIGNED';

const emptyProduct = (category: ProductCategory, code: string, displayOrder: number): CatalogProduct => ({
    code,
    category,
    name: '',
    description: '',
    imagePaths: [],
    displayOrder,
    isActive: true,
});

const CatalogProductsManager: React.FC = () => {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>('ALL');

    const [editing, setEditing] = useState<CatalogProduct | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [uploading, setUploading] = useState(false);
    /** 新規作成と同時に紐付ける選択肢（未割当タブから作った場合） */
    const [pendingRefs, setPendingRefs] = useState<OptionRef[]>([]);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [loadedProducts, itemsResult] = await Promise.all([
                fetchCatalogProducts(),
                supabase.from('items').select('*').order('display_order', { ascending: true }),
            ]);

            if (itemsResult.error) throw itemsResult.error;

            setProducts(loadedProducts);
            setItems((itemsResult.data || []).map(convertDbItem));
        } catch (error: any) {
            console.error('Error fetching catalog products:', error);
            alert(`商品マスタの取得に失敗しました: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    /** コード → その商品を使っている選択肢の数 */
    const usageCount = useMemo(() => {
        const counts = new Map<string, number>();
        for (const item of items) {
            for (const option of item.options || []) {
                if (!option.productCode) continue;
                counts.set(option.productCode, (counts.get(option.productCode) || 0) + 1);
            }
        }
        return counts;
    }, [items]);

    /** まだ商品に紐付いていない選択肢。名前でまとめる */
    const unassigned = useMemo(() => {
        const groups = new Map<string, UnassignedGroup>();

        for (const item of items) {
            for (const option of item.options || []) {
                if (option.productCode) continue;

                const name = (option.name || '').trim();
                const key = name || `__empty_${item.id}_${option.id}`;
                const ref: OptionRef = {
                    itemId: item.id,
                    itemName: item.name,
                    optionId: option.id,
                    optionName: name,
                    imagePaths: option.imagePaths || [],
                };

                const existing = groups.get(key);
                if (existing) {
                    existing.refs.push(ref);
                    if (existing.imagePaths.length === 0) existing.imagePaths = ref.imagePaths;
                } else {
                    groups.set(key, { name, refs: [ref], imagePaths: ref.imagePaths });
                }
            }
        }

        return Array.from(groups.values()).sort((a, b) => b.refs.length - a.refs.length);
    }, [items]);

    const visibleProducts = useMemo(() => {
        if (tab === 'ALL' || tab === 'UNASSIGNED') return products;
        return products.filter(p => p.category === tab);
    }, [products, tab]);

    // ================================================
    // 商品の追加・編集・コピー・削除
    // ================================================

    const startNew = (category: ProductCategory = 'ALTAR', refs: OptionRef[] = []) => {
        const maxOrder = products
            .filter(p => p.category === category)
            .reduce((max, p) => Math.max(max, p.displayOrder), 0);

        const draft = emptyProduct(category, nextProductCode(products, category), maxOrder + 1);
        // 未割当の選択肢から作る場合は、名前と画像を引き継ぐ
        if (refs.length > 0) {
            draft.name = refs[0].optionName;
            draft.imagePaths = refs.find(r => r.imagePaths.length > 0)?.imagePaths || [];
        }

        setEditing(draft);
        setIsNew(true);
        setPendingRefs(refs);
    };

    const handleSave = async () => {
        if (!editing) return;

        const code = editing.code.trim();
        if (!code) {
            alert('商品コードは必須です');
            return;
        }
        if (!editing.name.trim()) {
            alert('商品名は必須です');
            return;
        }
        if (isNew && products.some(p => p.code === code)) {
            alert(`商品コード「${code}」はすでに使われています`);
            return;
        }

        try {
            const payload = convertProductToDb({ ...editing, code });

            if (isNew) {
                const { error } = await supabase.from('catalog_products').insert([payload]);
                if (error) throw error;
                if (pendingRefs.length > 0) await assignCode(pendingRefs, code);
            } else {
                const { error } = await supabase
                    .from('catalog_products')
                    .update(payload)
                    .eq('code', code);
                if (error) throw error;
            }

            await fetchAll();
            closeEditor();
        } catch (error: any) {
            console.error('Error saving catalog product:', error);
            alert(`保存に失敗しました: ${error.message}`);
        }
    };

    const closeEditor = () => {
        setEditing(null);
        setIsNew(false);
        setPendingRefs([]);
    };

    /** 商品を複製する。コードは分類の次の連番になる */
    const handleCopy = async (product: CatalogProduct) => {
        const code = nextProductCode(products, product.category);
        if (!confirm(`「${product.name}」をコピーしますか？\n新しい商品コードは ${code} になります。`)) return;

        try {
            const copied: CatalogProduct = {
                ...product,
                code,
                name: `${product.name}のコピー`,
                displayOrder: product.displayOrder + 1,
            };

            const { error } = await supabase
                .from('catalog_products')
                .insert([convertProductToDb(copied)]);
            if (error) throw error;

            // コピー元より下にある同分類の商品を1つずつ後ろへずらす
            await shiftOrderAfter(product.category, product.displayOrder, code);
            await fetchAll();
        } catch (error: any) {
            console.error('Error copying catalog product:', error);
            alert(`コピーに失敗しました: ${error.message}`);
        }
    };

    /** 指定位置より下の並び順を詰め直す（コピーを直下に置くため） */
    const shiftOrderAfter = async (category: ProductCategory, afterOrder: number, insertedCode: string) => {
        const sameCategory = products
            .filter(p => p.category === category)
            .sort((a, b) => a.displayOrder - b.displayOrder);

        const reordered: string[] = [];
        for (const product of sameCategory) {
            reordered.push(product.code);
            if (product.displayOrder === afterOrder) reordered.push(insertedCode);
        }

        for (const [index, code] of reordered.entries()) {
            const { error } = await supabase
                .from('catalog_products')
                .update({ display_order: index + 1 })
                .eq('code', code);
            if (error) throw error;
        }
    };

    const handleDelete = async (product: CatalogProduct) => {
        const used = usageCount.get(product.code) || 0;
        const warning = used > 0
            ? `\n\nこの商品は ${used} 件の選択肢で使われています。削除すると紐付けが外れ、選択肢側の名前・画像に戻ります。`
            : '';

        if (!confirm(`「${product.name}」（${product.code}）を削除しますか？この操作は取り消せません。${warning}`)) return;

        try {
            const { error } = await supabase
                .from('catalog_products')
                .delete()
                .eq('code', product.code);
            if (error) throw error;

            // 選択肢に残った紐付けを外す
            if (used > 0) await clearCode(product.code);
            await fetchAll();
        } catch (error: any) {
            console.error('Error deleting catalog product:', error);
            alert(`削除に失敗しました: ${error.message}`);
        }
    };

    const handleMove = async (index: number, direction: -1 | 1) => {
        const list = [...visibleProducts];
        const target = index + direction;
        if (target < 0 || target >= list.length) return;

        [list[index], list[target]] = [list[target], list[index]];
        setProducts(prev => prev.map(p => {
            const moved = list.findIndex(l => l.code === p.code);
            return moved === -1 ? p : { ...p, displayOrder: moved + 1 };
        }));

        try {
            for (const [i, product] of list.entries()) {
                const { error } = await supabase
                    .from('catalog_products')
                    .update({ display_order: i + 1 })
                    .eq('code', product.code);
                if (error) throw error;
            }
            await fetchAll();
        } catch (error) {
            console.error('Error reordering catalog products:', error);
            alert('並び替えに失敗しました');
            await fetchAll();
        }
    };

    // ================================================
    // 選択肢への紐付け
    // ================================================

    /** 選択肢に商品コードを書き込む */
    const assignCode = async (refs: OptionRef[], code: string) => {
        const byItem = new Map<number, Set<string>>();
        for (const ref of refs) {
            const set = byItem.get(ref.itemId) || new Set<string>();
            set.add(ref.optionId);
            byItem.set(ref.itemId, set);
        }

        for (const [itemId, optionIds] of byItem) {
            const item = items.find(i => i.id === itemId);
            if (!item) continue;

            const newOptions = (item.options || []).map(option =>
                optionIds.has(option.id) ? { ...option, productCode: code } : option
            );

            const { error } = await supabase
                .from('items')
                .update({ options: newOptions })
                .eq('id', itemId);
            if (error) throw error;
        }
    };

    /** 削除された商品への紐付けを消す */
    const clearCode = async (code: string) => {
        for (const item of items) {
            if (!(item.options || []).some(option => option.productCode === code)) continue;

            const newOptions = (item.options || []).map(option => {
                if (option.productCode !== code) return option;
                const { productCode, ...rest } = option;
                return rest;
            });

            const { error } = await supabase
                .from('items')
                .update({ options: newOptions })
                .eq('id', item.id);
            if (error) throw error;
        }
    };

    const handleAssignExisting = async (group: UnassignedGroup, code: string) => {
        if (!code) return;
        const product = products.find(p => p.code === code);
        if (!product) return;

        const where = group.refs.length > 1 ? `\n${group.refs.length}箇所すべてに反映されます。` : '';
        if (!confirm(`「${group.name || '名称未設定'}」を商品「${product.name}（${code}）」に紐付けますか？${where}`)) return;

        try {
            await assignCode(group.refs, code);
            await fetchAll();
        } catch (error: any) {
            console.error('Error assigning product:', error);
            alert(`紐付けに失敗しました: ${error.message}`);
        }
    };

    // ================================================
    // 画像
    // ================================================

    const handleUpload = async (files: FileList | null) => {
        if (!editing || !files || files.length === 0) return;

        setUploading(true);
        try {
            const paths = await uploadImages(ITEM_IMAGE_BUCKET, Array.from(files));
            setEditing({ ...editing, imagePaths: [...editing.imagePaths, ...paths] });
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert(`画像のアップロードに失敗しました: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = async (path: string) => {
        if (!editing) return;
        setEditing({ ...editing, imagePaths: editing.imagePaths.filter(p => p !== path) });

        // 他の商品やアイテムが同じ画像を使っている場合はファイルを消さない
        const usedElsewhere =
            products.some(p => p.code !== editing.code && p.imagePaths.includes(path)) ||
            items.some(item =>
                (item.imagePaths || []).includes(path) ||
                (item.options || []).some(option => (option.imagePaths || []).includes(path))
            );
        if (!usedElsewhere) await removeImages(ITEM_IMAGE_BUCKET, [path]);
    };

    if (loading) return <div className="p-4">読み込み中...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-700">商品マスタ</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        画像・説明・商品名はここが唯一の置き場所です。金額はアイテム管理の選択肢側で設定します。
                    </p>
                </div>
                <button
                    onClick={() => startNew(tab === 'ALL' || tab === 'UNASSIGNED' ? 'ALTAR' : tab)}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 whitespace-nowrap"
                >
                    <Plus size={18} />
                    新規商品
                </button>
            </div>

            {/* 分類タブ */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setTab('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        tab === 'ALL'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                    }`}
                >
                    すべて（{products.length}）
                </button>
                {PRODUCT_CATEGORIES.map(category => {
                    const count = products.filter(p => p.category === category.code).length;
                    return (
                        <button
                            key={category.code}
                            onClick={() => setTab(category.code)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                tab === category.code
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                            }`}
                        >
                            {category.label}（{count}）
                        </button>
                    );
                })}
                <button
                    onClick={() => setTab('UNASSIGNED')}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        tab === 'UNASSIGNED'
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400'
                    }`}
                >
                    未割当（{unassigned.length}）
                </button>
            </div>

            {tab === 'UNASSIGNED' ? (
                <UnassignedList
                    groups={unassigned}
                    products={products}
                    onCreate={group => startNew('OTHER', group.refs)}
                    onAssign={handleAssignExisting}
                />
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="p-4 w-28">画像</th>
                                <th className="p-4 w-32">コード</th>
                                <th className="p-4">商品名</th>
                                <th className="p-4 w-32">分類</th>
                                <th className="p-4 w-28 text-center">使用箇所</th>
                                <th className="p-4 w-40 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visibleProducts.map((product, index) => (
                                <tr key={product.code} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        {product.imagePaths[0] ? (
                                            <img
                                                src={storageImageUrl(ITEM_IMAGE_BUCKET, product.imagePaths[0])}
                                                alt=""
                                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-xs">
                                                画像なし
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 font-mono text-sm text-gray-600">{product.code}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-800">{product.name}</span>
                                            {!product.isActive && (
                                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                    <EyeOff size={14} />非公開
                                                </span>
                                            )}
                                        </div>
                                        {product.description && (
                                            <div className="text-xs text-gray-400 mt-1 truncate max-w-md">
                                                {product.description}
                                            </div>
                                        )}
                                        {product.imagePaths.length > 1 && (
                                            <div className="text-[10px] text-gray-400 mt-1">
                                                {product.imagePaths.length}枚
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-100 border-gray-200 text-gray-600 whitespace-nowrap">
                                            {PRODUCT_CATEGORY_LABEL[product.category]}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-sm text-gray-500">
                                        {usageCount.get(product.code) || 0}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => handleMove(index, -1)}
                                                disabled={index === 0}
                                                className="p-1 text-gray-400 hover:text-emerald-600 rounded disabled:opacity-30"
                                                title="上へ"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleMove(index, 1)}
                                                disabled={index === visibleProducts.length - 1}
                                                className="p-1 text-gray-400 hover:text-emerald-600 rounded disabled:opacity-30"
                                                title="下へ"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setEditing({ ...product }); setIsNew(false); }}
                                                className="p-1 text-gray-400 hover:text-emerald-600 rounded"
                                                title="編集"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleCopy(product)}
                                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                                title="コピー"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product)}
                                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                title="削除"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {visibleProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-gray-400">
                                        商品がまだ登録されていません
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <h3 className="text-xl font-bold mb-4">{isNew ? '商品を追加' : '商品を編集'}</h3>

                        {pendingRefs.length > 0 && (
                            <div className="mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                保存すると、{pendingRefs.length}箇所の選択肢にこの商品が紐付きます
                                （{pendingRefs.map(r => r.itemName).join('、')}）
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">商品コード</label>
                                    <input
                                        type="text"
                                        value={editing.code}
                                        onChange={e => setEditing({ ...editing, code: e.target.value })}
                                        disabled={!isNew}
                                        placeholder="UR-01"
                                        className="w-full p-2 border rounded font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        {isNew ? '分類を変えると連番を振り直します。手入力も可' : 'コードは変更できません'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                                    <select
                                        value={editing.category}
                                        onChange={e => {
                                            const category = e.target.value as ProductCategory;
                                            setEditing({
                                                ...editing,
                                                category,
                                                // 新規のうちは分類に合わせてコードを振り直す
                                                code: isNew ? nextProductCode(products, category) : editing.code,
                                            });
                                        }}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                    >
                                        {PRODUCT_CATEGORIES.map(category => (
                                            <option key={category.code} value={category.code}>
                                                {category.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">商品名</label>
                                <input
                                    type="text"
                                    value={editing.name}
                                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                                    placeholder="白基調 W1,800"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                                <textarea
                                    value={editing.description}
                                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                                    placeholder="[サイズ]約W1,800　白を基調とした、シンプルで清楚な印象"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="catalog_is_active"
                                    type="checkbox"
                                    checked={editing.isActive}
                                    onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="catalog_is_active" className="text-sm text-gray-700 cursor-pointer">
                                    カタログに表示する
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">商品画像</label>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {editing.imagePaths.map(path => (
                                        <div key={path} className="relative">
                                            <img
                                                src={storageImageUrl(ITEM_IMAGE_BUCKET, path)}
                                                alt=""
                                                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(path)}
                                                className="absolute top-0 right-0 p-1 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-red-600"
                                                title="この画像を削除"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <label className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                                    <ImagePlus size={18} />
                                    {uploading ? 'アップロード中...' : '画像を追加'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        disabled={uploading}
                                        onChange={e => handleUpload(e.target.files)}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeEditor}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={uploading}
                                className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                                保存する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ================================================
// 未割当の選択肢
// ================================================

interface UnassignedListProps {
    groups: UnassignedGroup[];
    products: CatalogProduct[];
    onCreate: (group: UnassignedGroup) => void;
    onAssign: (group: UnassignedGroup, code: string) => void;
}

const UnassignedList: React.FC<UnassignedListProps> = ({ groups, products, onCreate, onAssign }) => {
    if (groups.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">
                すべての選択肢が商品に紐付いています
            </div>
        );
    }

    return (
        <div>
            <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                商品コードが付いていない選択肢です。同じ名前のものはまとめて割り当てられます。
                紐付けるまでは、これまでどおり選択肢側の名前・画像で表示されます。
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 w-24">画像</th>
                            <th className="p-4">選択肢</th>
                            <th className="p-4 w-64">使われているアイテム</th>
                            <th className="p-4 w-80 text-center">割り当て</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {groups.map(group => (
                            <tr key={group.name || group.refs[0].optionId} className="hover:bg-gray-50">
                                <td className="p-4">
                                    {group.imagePaths[0] ? (
                                        <img
                                            src={storageImageUrl(ITEM_IMAGE_BUCKET, group.imagePaths[0])}
                                            alt=""
                                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-[10px]">
                                            画像なし
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className="font-bold text-gray-800">
                                        {group.name || <span className="text-gray-400">（名称未設定）</span>}
                                    </span>
                                    {group.refs.length > 1 && (
                                        <span className="ml-2 text-xs text-amber-600">{group.refs.length}箇所</span>
                                    )}
                                </td>
                                <td className="p-4 text-xs text-gray-500">
                                    {Array.from(new Set(group.refs.map(r => r.itemName))).join('、')}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <select
                                            defaultValue=""
                                            onChange={e => {
                                                onAssign(group, e.target.value);
                                                e.target.value = '';
                                            }}
                                            className="flex-1 p-2 border rounded text-sm bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="">既存の商品に紐付ける...</option>
                                            {PRODUCT_CATEGORIES.map(category => {
                                                const inCategory = products.filter(p => p.category === category.code);
                                                if (inCategory.length === 0) return null;
                                                return (
                                                    <optgroup key={category.code} label={category.label}>
                                                        {inCategory.map(product => (
                                                            <option key={product.code} value={product.code}>
                                                                {product.code}　{product.name}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            })}
                                        </select>
                                        <button
                                            onClick={() => onCreate(group)}
                                            className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm hover:bg-emerald-100 whitespace-nowrap"
                                            title="この選択肢から新しい商品を作る"
                                        >
                                            <Link2 size={14} />
                                            商品にする
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CatalogProductsManager;
