import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FlowerProduct } from '../../types';
import { formatYen } from '../../lib/flower';
import { FLOWER_IMAGE_BUCKET, storageImageUrl, uploadImages, removeImages } from '../../lib/storage';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, ImagePlus, X, EyeOff } from 'lucide-react';

const CATEGORIES = ['供花', '花環', '盛籠', '枕花'];

const emptyProduct = (displayOrder: number): FlowerProduct => ({
    id: '',
    code: '',
    name: '',
    description: '',
    category: CATEGORIES[0],
    price: 0,
    image_paths: [],
    display_order: displayOrder,
    is_active: true,
});

const FlowerProductsManager: React.FC = () => {
    const [products, setProducts] = useState<FlowerProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<FlowerProduct | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('flower_products')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching flower products:', error);
            alert('供花商品の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editing) return;
        if (!editing.code.trim() || !editing.name.trim()) {
            alert('商品コードと商品名は必須です');
            return;
        }

        const payload = {
            code: editing.code.trim(),
            name: editing.name.trim(),
            description: editing.description,
            category: editing.category,
            price: editing.price,
            image_paths: editing.image_paths,
            display_order: editing.display_order,
            is_active: editing.is_active,
        };

        try {
            if (isNew) {
                const { error } = await supabase.from('flower_products').insert([payload]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('flower_products')
                    .update(payload)
                    .eq('id', editing.id);
                if (error) throw error;
            }

            await fetchProducts();
            setEditing(null);
            setIsNew(false);
        } catch (error: any) {
            console.error('Error saving flower product:', error);
            alert(`保存に失敗しました: ${error.message}`);
        }
    };

    const handleDelete = async (product: FlowerProduct) => {
        if (!confirm(`「${product.name}」を削除しますか？この操作は取り消せません。`)) return;

        try {
            const { error } = await supabase.from('flower_products').delete().eq('id', product.id);
            if (error) throw error;

            if (product.image_paths.length > 0) {
                await removeImages(FLOWER_IMAGE_BUCKET, product.image_paths);
            }
            await fetchProducts();
        } catch (error: any) {
            console.error('Error deleting flower product:', error);
            alert(`削除に失敗しました。受注実績のある商品は削除できません: ${error.message}`);
        }
    };

    const handleMove = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= products.length) return;

        const reordered = [...products];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        setProducts(reordered);

        try {
            for (let i = 0; i < reordered.length; i++) {
                const { error } = await supabase
                    .from('flower_products')
                    .update({ display_order: i + 1 })
                    .eq('id', reordered[i].id);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error reordering flower products:', error);
            alert('並び替えに失敗しました');
            await fetchProducts();
        }
    };

    const handleUpload = async (files: FileList | null) => {
        if (!editing || !files || files.length === 0) return;

        setUploading(true);
        try {
            const paths = await uploadImages(FLOWER_IMAGE_BUCKET, Array.from(files));
            setEditing({ ...editing, image_paths: [...editing.image_paths, ...paths] });
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert(`画像のアップロードに失敗しました: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = async (path: string) => {
        if (!editing) return;
        setEditing({ ...editing, image_paths: editing.image_paths.filter(p => p !== path) });
        await removeImages(FLOWER_IMAGE_BUCKET, [path]);
    };

    const startNew = () => {
        const maxOrder = products.reduce((max, p) => Math.max(max, p.display_order), 0);
        setEditing(emptyProduct(maxOrder + 1));
        setIsNew(true);
    };

    if (loading) return <div className="p-4">読み込み中...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-700">供花商品管理</h3>
                <button
                    onClick={startNew}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                    <Plus size={18} />
                    新規商品
                </button>
            </div>

            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <h3 className="text-xl font-bold mb-4">{isNew ? '商品を追加' : '商品を編集'}</h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">商品コード</label>
                                    <input
                                        type="text"
                                        value={editing.code}
                                        onChange={e => setEditing({ ...editing, code: e.target.value })}
                                        placeholder="KY-01"
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                                    <select
                                        value={editing.category}
                                        onChange={e => setEditing({ ...editing, category: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">商品名</label>
                                <input
                                    type="text"
                                    value={editing.name}
                                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                                <textarea
                                    value={editing.description}
                                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        価格（税抜・送料/設営費込み）
                                    </label>
                                    <input
                                        type="number"
                                        value={editing.price}
                                        onChange={e => setEditing({ ...editing, price: Number(e.target.value) })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <input
                                        id="is_active"
                                        type="checkbox"
                                        checked={editing.is_active}
                                        onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">
                                        発注サイトに公開する
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">商品画像</label>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {editing.image_paths.map(path => (
                                        <div key={path} className="relative">
                                            <img
                                                src={storageImageUrl(FLOWER_IMAGE_BUCKET, path)}
                                                alt=""
                                                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                            />
                                            <button
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
                                onClick={() => { setEditing(null); setIsNew(false); }}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={uploading}
                                className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                保存する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 w-32">画像</th>
                            <th className="p-4">商品</th>
                            <th className="p-4 w-32">カテゴリ</th>
                            <th className="p-4 w-32 text-right">価格(税抜)</th>
                            <th className="p-4 w-32 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {products.map((product, index) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                    {product.image_paths[0] ? (
                                        <img
                                            src={storageImageUrl(FLOWER_IMAGE_BUCKET, product.image_paths[0])}
                                            alt=""
                                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-xs">
                                            画像なし
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800">{product.name}</span>
                                        {!product.is_active && (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                <EyeOff size={14} />非公開
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">{product.code}</div>
                                </td>
                                <td className="p-4 text-gray-600">{product.category}</td>
                                <td className="p-4 text-right font-bold text-gray-700">{formatYen(product.price)}</td>
                                <td className="p-4">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => handleMove(index, -1)}
                                            disabled={index === 0}
                                            className="p-1 text-gray-400 hover:text-emerald-600 rounded"
                                            title="上へ"
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleMove(index, 1)}
                                            disabled={index === products.length - 1}
                                            className="p-1 text-gray-400 hover:text-emerald-600 rounded"
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
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-gray-400">
                                    商品がまだ登録されていません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FlowerProductsManager;
