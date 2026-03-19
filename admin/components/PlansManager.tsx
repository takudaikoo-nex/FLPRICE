import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Item, Plan, PlanId } from '../../types';
import { Edit, Trash2, Plus, X } from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import VirtualItemSelector from '../../components/ui/VirtualItemSelector';
import { convertDbItem } from '../../lib/converter';

const PlansManager: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [linkedItems, setLinkedItems] = useState<Set<number>>(new Set());
    const [isNew, setIsNew] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansResult, itemsResult] = await Promise.all([
                supabase.from('plans').select('*').order('id'),
                supabase.from('items').select('*').order('display_order')
            ]);

            if (plansResult.error) throw plansResult.error;
            if (itemsResult.error) throw itemsResult.error;

            setPlans(plansResult.data as Plan[] || []);
            setItems((itemsResult.data || []).map(convertDbItem));

        } catch (error) {
            console.error('Error fetching data:', error);
            alert('データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingPlan) return;

        try {
            // 1. Save Plan
            if (isNew) {
                const { error } = await supabase
                    .from('plans')
                    .insert([editingPlan]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('plans')
                    .update(editingPlan)
                    .eq('id', editingPlan.id);
                if (error) throw error;
            }

            // 2. Update Item Linkages
            // We need to compare linkedItems state with original items state
            // OR just update all items based on current linkedItems set.
            // A more efficient way: find changed items.

            const updates = items.map(item => {
                const isLinked = linkedItems.has(item.id);
                const wasLinked = item.allowedPlans.includes(editingPlan.id as any);

                if (isLinked && !wasLinked) {
                    // Add link
                    return { ...item, allowedPlans: [...item.allowedPlans, editingPlan.id] };
                } else if (!isLinked && wasLinked) {
                    // Remove link
                    return { ...item, allowedPlans: item.allowedPlans.filter(p => p !== editingPlan.id) };
                }
                return null;
            }).filter(Boolean);

            if (updates.length > 0) {
                await Promise.all(updates.map(async (item: any) => {
                    const dbItem = {
                        allowed_plans: item.allowedPlans
                    };
                    await supabase.from('items').update(dbItem).eq('id', item.id);
                }));
            }

            await fetchData();
            setEditingPlan(null);
            setIsNew(false);
        } catch (error: any) {
            console.error('Error saving plan:', error);
            alert(`保存に失敗しました: ${error.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;

        try {
            const { error } = await supabase
                .from('plans')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting plan:', error);
            alert('削除に失敗しました');
        }
    };

    const startEdit = (plan: Plan) => {
        setEditingPlan({ ...plan });
        // Initialize linked items
        const linked = new Set<number>();
        items.forEach(item => {
            if (item.allowedPlans.includes(plan.id as any)) {
                linked.add(item.id);
            }
        });
        setLinkedItems(linked);
        setIsNew(false);
    };

    const startNew = () => {
        setEditingPlan({
            id: '' as PlanId,
            name: '',
            price: 0,
            description: ''
        });
        setLinkedItems(new Set());
        setIsNew(true);
    };

    const toggleItemLink = (itemId: number) => {
        const newLinked = new Set(linkedItems);
        if (newLinked.has(itemId)) {
            newLinked.delete(itemId);
        } else {
            newLinked.add(itemId);
        }
        setLinkedItems(newLinked);
    };

    // Items are now all the same type (free_input options)

    if (loading) return <div className="p-4">読み込み中...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-700">プラン一覧</h3>
                <button
                    onClick={startNew}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                    <Plus size={18} />
                    新規プラン追加
                </button>
            </div>

            {editingPlan && (
                <>
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                                <h3 className="text-xl font-bold">
                                    {isNew ? '新規プラン作成' : 'プラン編集'}
                                </h3>
                                <button onClick={() => setEditingPlan(null)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: Plan Details */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">基本情報</h4>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ID (アルファベット)</label>
                                            <input
                                                type="text"
                                                value={editingPlan.id}
                                                onChange={e => setEditingPlan({ ...editingPlan, id: e.target.value as PlanId })}
                                                disabled={!isNew}
                                                className="w-full p-2 border rounded bg-gray-50 disabled:text-gray-500"
                                                placeholder="例: a"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">プラン名</label>
                                            <input
                                                type="text"
                                                value={editingPlan.name}
                                                onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">価格 (税抜)</label>
                                            <input
                                                type="number"
                                                value={editingPlan.price}
                                                onChange={e => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) || 0 })}
                                                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                                            <textarea
                                                value={editingPlan.description}
                                                onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Linked Options */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
                                            連携オプション設定
                                        </h4>
                                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                                            <p className="text-sm text-gray-500 mb-4">
                                                現在 <span className="font-bold text-emerald-600 text-lg">{linkedItems.size}</span> 個のアイテムが選択されています
                                            </p>
                                            <button
                                                onClick={() => setIsDrawerOpen(true)}
                                                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-bold shadow-sm"
                                            >
                                                アイテムを選択・編集する
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button
                                    onClick={() => setEditingPlan(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-sm"
                                >
                                    保存する
                                </button>
                            </div>
                        </div>
                    </div>

                    <Drawer
                        isOpen={isDrawerOpen}
                        onClose={() => setIsDrawerOpen(false)}
                        title="連携アイテムの選択"
                        width="md:w-[600px]"
                    >
                        <VirtualItemSelector
                            items={items}
                            selectedIds={linkedItems}
                            onToggle={toggleItemLink}
                            height={800} // Viewport height approximation
                        />
                    </Drawer>
                </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                                プラン
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => startEdit(plan)}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <h4 className="text-lg font-bold text-gray-800 mb-1">{plan.name}</h4>
                        <p className="text-2xl font-bold text-emerald-600 mb-3">
                            ¥{plan.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-2">{plan.description}</p>
                        <div className="mt-3 text-xs text-gray-400">ID: {plan.id}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlansManager;
