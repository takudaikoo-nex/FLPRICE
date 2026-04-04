import React, { useState } from 'react';
import { Item, Plan } from '../../types';
import { ArrowLeft } from 'lucide-react';

interface ItemEditorProps {
    item: Item;
    isNew: boolean;
    onSave: (item: Item) => Promise<void>;
    onCancel: () => void;
    plans: Plan[];
}

const ItemEditor: React.FC<ItemEditorProps> = ({ item, isNew, onSave, onCancel, plans }) => {
    const [editingItem, setEditingItem] = useState<Item>(JSON.parse(JSON.stringify(item)));

    const handleSave = async () => {
        await onSave(editingItem);
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
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">設定</h3>
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-1">デフォルト金額</label>
                            <div className="relative w-48">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                                <input
                                    type="number"
                                    value={editingItem.basePrice || 0}
                                    onChange={e => setEditingItem({ ...editingItem, basePrice: parseInt(e.target.value) || 0 })}
                                    className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-right"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">※ ユーザーが金額を自由に入力します。ここではデフォルト値を設定します。</p>
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
