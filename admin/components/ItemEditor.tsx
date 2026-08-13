import React, { useState } from 'react';
import { Item, Plan, ItemType, DropdownOption } from '../../types';
import { ITEM_IMAGE_BUCKET, storageImageUrl, uploadImages, removeImages } from '../../lib/storage';
import { ArrowLeft, Plus, Trash2, ImagePlus, X, Copy } from 'lucide-react';
import { ITEM_TYPE_HINT, hasOptions } from './itemTypes';

interface ItemEditorProps {
    item: Item;
    isNew: boolean;
    onSave: (item: Item) => Promise<void>;
    onCancel: () => void;
    plans: Plan[];
}

const ItemEditor: React.FC<ItemEditorProps> = ({ item, isNew, onSave, onCancel, plans }) => {
    const [editingItem, setEditingItem] = useState<Item>(JSON.parse(JSON.stringify(item)));
    const [uploading, setUploading] = useState(false);

    const handleSave = async () => {
        await onSave(editingItem);
    };

    /** アイテム本体の画像を追加する（アップロード時に自動で圧縮される） */
    const handleUploadItemImages = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const paths = await uploadImages(ITEM_IMAGE_BUCKET, Array.from(files));
            setEditingItem({
                ...editingItem,
                imagePaths: [...(editingItem.imagePaths || []), ...paths],
            });
        } catch (error: any) {
            console.error('Error uploading item image:', error);
            alert(`画像のアップロードに失敗しました: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    /** コピーで同じ画像を共有している場合があるので、どこかで使われていればファイルは残す */
    const isPathStillUsed = (state: Item, path: string) =>
        (state.imagePaths || []).includes(path) ||
        (state.options || []).some(o => (o.imagePaths || []).includes(path));

    const handleRemoveItemImage = async (path: string) => {
        const next = {
            ...editingItem,
            imagePaths: (editingItem.imagePaths || []).filter(p => p !== path),
        };
        setEditingItem(next);
        if (!isPathStillUsed(next, path)) await removeImages(ITEM_IMAGE_BUCKET, [path]);
    };

    /** グレード（選択肢）ごとの画像を追加する */
    const handleUploadOptionImages = async (index: number, files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const paths = await uploadImages(ITEM_IMAGE_BUCKET, Array.from(files));
            const newOptions = [...(editingItem.options || [])];
            newOptions[index] = {
                ...newOptions[index],
                imagePaths: [...(newOptions[index].imagePaths || []), ...paths],
            };
            setEditingItem({ ...editingItem, options: newOptions });
        } catch (error: any) {
            console.error('Error uploading option image:', error);
            alert(`画像のアップロードに失敗しました: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveOptionImage = async (index: number, path: string) => {
        const newOptions = [...(editingItem.options || [])];
        newOptions[index] = {
            ...newOptions[index],
            imagePaths: (newOptions[index].imagePaths || []).filter(p => p !== path),
        };
        const next = { ...editingItem, options: newOptions };
        setEditingItem(next);
        if (!isPathStillUsed(next, path)) await removeImages(ITEM_IMAGE_BUCKET, [path]);
    };

    const optionLabel = (opt: DropdownOption) => opt.name || '名称未設定の選択肢';

    /** 選択肢を複製して、コピー元のすぐ下に置く */
    const handleCopyOption = (index: number) => {
        const options = editingItem.options || [];
        const source = options[index];
        if (!confirm(`「${optionLabel(source)}」をコピーしますか？\nコピーはすぐ下に追加されます。`)) return;

        const copied: DropdownOption = {
            ...JSON.parse(JSON.stringify(source)),
            id: `opt_${Date.now().toString(36)}`,
            name: source.name ? `${source.name}のコピー` : '',
        };
        const newOptions = [...options];
        newOptions.splice(index + 1, 0, copied);
        setEditingItem({ ...editingItem, options: newOptions });
    };

    const handleDeleteOption = (index: number) => {
        const options = editingItem.options || [];
        if (!confirm(`「${optionLabel(options[index])}」を削除しますか？`)) return;
        setEditingItem({ ...editingItem, options: options.filter((_, i) => i !== index) });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 p-4 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 text-gray-500">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800">
                        {isNew ? '新規アイテム作成' : 'アイテム編集'}
                    </h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-white border border-transparent hover:border-gray-300 rounded-lg transition-all">
                        キャンセル
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm font-bold">
                        保存する
                    </button>
                </div>
            </div>

            {/* Form */}
            <div className="p-8 max-w-4xl mx-auto space-y-8">
                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">基本情報</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                            <input
                                type="number"
                                value={editingItem.id}
                                onChange={e => setEditingItem({ ...editingItem, id: parseInt(e.target.value) || 0 })}
                                disabled={!isNew}
                                className="w-full p-2 border rounded-lg bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">表示順</label>
                            <input
                                type="number"
                                value={editingItem.displayOrder}
                                onChange={e => setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">アイテム名</label>
                            <input
                                type="text"
                                value={editingItem.name}
                                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg"
                                placeholder="アイテム名を入力"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">説明文</label>
                            <textarea
                                value={editingItem.description}
                                onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                                placeholder="アイテムの簡単な説明を入力"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">画像</label>
                            <p className="text-xs text-gray-400 mb-2">
                                お客様にお見せするカタログページに表示されます。アップロード時に自動で圧縮されます。
                            </p>
                            <div className="flex flex-wrap gap-3 mb-3">
                                {(editingItem.imagePaths || []).map(path => (
                                    <div key={path} className="relative">
                                        <img
                                            src={storageImageUrl(ITEM_IMAGE_BUCKET, path)}
                                            alt=""
                                            className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItemImage(path)}
                                            className="absolute top-0 right-0 p-1 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-red-600"
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
                                    onChange={e => handleUploadItemImages(e.target.files)}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">設定</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">アイテムの種類</label>
                            <select
                                value={editingItem.type}
                                onChange={e => {
                                    const newType = e.target.value as ItemType;
                                    setEditingItem({
                                        ...editingItem,
                                        type: newType,
                                        // options array should be initialized if converting to dropdown
                                        options: newType === 'dropdown' || newType === 'multi_grade' ? (editingItem.options || []) : editingItem.options
                                    });
                                }}
                                className="w-full md:w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            >
                                <option value="checkbox">チェックボックス (追加オプション)</option>
                                <option value="dropdown">プルダウン (複数の選択肢から選ぶ)</option>
                                <option value="multi_grade">数量入力 (グレードごとに個数を入力・割引あり)</option>
                                <option value="free_input">手入力 (金額を自由に打ち込む)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-2">{ITEM_TYPE_HINT[editingItem.type]}</p>
                        </div>

                        {/* 税率フラグ。どちらも選ばなければ標準税率10% */}
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-gray-500">※ どちらも選ばない場合は標準税率10%になります</p>
                            <label className="flex items-center gap-3 cursor-pointer w-fit">
                                <input
                                    type="checkbox"
                                    checked={editingItem.nonTaxable || false}
                                    onChange={e => setEditingItem({ ...editingItem, nonTaxable: e.target.checked, reducedTax: e.target.checked ? false : editingItem.reducedTax })}
                                    className="w-5 h-5 accent-orange-500 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">非課税項目（消費税を計算しない）</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer w-fit">
                                <input
                                    type="checkbox"
                                    checked={editingItem.reducedTax || false}
                                    onChange={e => setEditingItem({ ...editingItem, reducedTax: e.target.checked, nonTaxable: e.target.checked ? false : editingItem.nonTaxable })}
                                    className="w-5 h-5 accent-orange-500 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">軽減税率 8%（会葬御礼品など食品）</span>
                            </label>
                        </div>

                        {hasOptions(editingItem.type) && (
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-medium text-emerald-800">
                                        {editingItem.type === 'multi_grade' ? 'グレード（個数を入力できる選択肢）' : 'プルダウン選択肢'}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newOption = {
                                                id: `opt_${Date.now().toString(36)}`,
                                                name: '',
                                                price: 0,
                                                allowedPlans: plans.map(p => p.id)
                                            };
                                            setEditingItem({
                                                ...editingItem,
                                                options: [...(editingItem.options || []), newOption]
                                            });
                                        }}
                                        className="text-emerald-700 bg-white border border-emerald-300 px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={16} /> 追加
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {(editingItem.options || []).length === 0 ? (
                                        <p className="text-xs text-emerald-600">※ 選択肢がありません。追加ボタンを押して追加してください。</p>
                                    ) : (
                                        (editingItem.options || []).map((opt, idx) => (
                                            <div key={opt.id || idx} className="bg-white p-2 rounded border border-emerald-100 shadow-sm">
                                              <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={opt.name}
                                                    onChange={e => {
                                                        const newOptions = [...(editingItem.options || [])];
                                                        newOptions[idx].name = e.target.value;
                                                        setEditingItem({ ...editingItem, options: newOptions });
                                                    }}
                                                    placeholder="選択肢名 (例: 椿グレード)"
                                                    className="flex-1 p-2 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                                                />
                                                <div className="flex items-center gap-1 w-32 shrink-0">
                                                    <span className="text-gray-500 text-sm">¥</span>
                                                    <input
                                                        type="number"
                                                        value={opt.price}
                                                        onChange={e => {
                                                            const newOptions = [...(editingItem.options || [])];
                                                            newOptions[idx].price = parseInt(e.target.value) || 0;
                                                            setEditingItem({ ...editingItem, options: newOptions });
                                                        }}
                                                        className="w-full p-2 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyOption(idx)}
                                                    title="コピー（すぐ下に追加されます）"
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteOption(idx)}
                                                    title="削除"
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                              </div>

                                              {/* この選択肢を出すプラン。外したプランでは選べなくなる */}
                                              <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-1">
                                                <span className="text-[10px] text-gray-400 mr-1 shrink-0">対象プラン</span>
                                                {plans.map(plan => {
                                                    const checked = (opt.allowedPlans || []).includes(plan.id);
                                                    return (
                                                        <button
                                                            key={plan.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const newOptions = [...(editingItem.options || [])];
                                                                const current = newOptions[idx].allowedPlans || [];
                                                                newOptions[idx] = {
                                                                    ...newOptions[idx],
                                                                    allowedPlans: checked
                                                                        ? current.filter(p => p !== plan.id)
                                                                        : [...current, plan.id],
                                                                };
                                                                setEditingItem({ ...editingItem, options: newOptions });
                                                            }}
                                                            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                                                checked
                                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                                    : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-300'
                                                            }`}
                                                        >
                                                            {plan.name}
                                                        </button>
                                                    );
                                                })}
                                              </div>

                                              <div className="flex flex-wrap items-center gap-2 mt-2 pl-1">
                                                {(opt.imagePaths || []).map(path => (
                                                    <div key={path} className="relative">
                                                        <img
                                                            src={storageImageUrl(ITEM_IMAGE_BUCKET, path)}
                                                            alt=""
                                                            className="w-20 h-20 object-cover rounded border border-gray-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveOptionImage(idx, path)}
                                                            className="absolute top-0 right-0 p-1 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-red-600"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 text-xs text-gray-600">
                                                    <ImagePlus size={14} />
                                                    画像
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        disabled={uploading}
                                                        onChange={e => handleUploadOptionImages(idx, e.target.files)}
                                                        className="hidden"
                                                    />
                                                </label>
                                              </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ベース金額（追加オプションなど）</label>
                            <div className="relative w-48">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                                <input
                                    type="number"
                                    value={editingItem.basePrice || 0}
                                    onChange={e => setEditingItem({ ...editingItem, basePrice: parseInt(e.target.value) || 0 })}
                                    className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-right"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">※ チェックボックス選択時の金額、または手入力時のデフォルト金額です。</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">利用可能プラン</label>
                            <p className="text-xs text-gray-400 mb-2">※ 空の場合は全プランで表示されます</p>
                            <div className="flex flex-wrap gap-4">
                                {plans.map(plan => (
                                    <label key={plan.id} className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all
                                        ${editingItem.allowedPlans.includes(plan.id)
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-sm'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
                                    `}>
                                        <input
                                            type="checkbox"
                                            checked={editingItem.allowedPlans.includes(plan.id)}
                                            onChange={e => {
                                                const newPlans = e.target.checked
                                                    ? [...editingItem.allowedPlans, plan.id]
                                                    : editingItem.allowedPlans.filter(p => p !== plan.id);
                                                // allowedから外れたらincludedも外す
                                                const newIncluded = e.target.checked
                                                    ? editingItem.includedInPlans
                                                    : editingItem.includedInPlans.filter(p => p !== plan.id);
                                                setEditingItem({ ...editingItem, allowedPlans: newPlans, includedInPlans: newIncluded });
                                            }}
                                            className="accent-emerald-600 w-4 h-4"
                                        />
                                        <span className="text-sm">{plan.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">プラン料金に含む</label>
                            <p className="text-xs text-gray-400 mb-2">※ 利用可能プランの中から、プラン料金に含まれるプランを選択</p>
                            <div className="flex flex-wrap gap-4">
                                {plans.filter(plan => editingItem.allowedPlans.includes(plan.id)).map(plan => (
                                    <label key={plan.id} className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all
                                        ${editingItem.includedInPlans.includes(plan.id)
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
                                    `}>
                                        <input
                                            type="checkbox"
                                            checked={editingItem.includedInPlans.includes(plan.id)}
                                            onChange={e => {
                                                const newIncluded = e.target.checked
                                                    ? [...editingItem.includedInPlans, plan.id]
                                                    : editingItem.includedInPlans.filter(p => p !== plan.id);
                                                setEditingItem({ ...editingItem, includedInPlans: newIncluded });
                                            }}
                                            className="accent-blue-600 w-4 h-4"
                                        />
                                        <span className="text-sm">{plan.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end gap-4">
                <button onClick={onCancel} className="px-6 py-3 text-gray-600 hover:bg-white border border-transparent hover:border-gray-300 rounded-lg transition-all font-bold">
                    キャンセル
                </button>
                <button onClick={handleSave} className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg font-bold">
                    保存する
                </button>
            </div>
        </div>
    );
};

export default ItemEditor;
