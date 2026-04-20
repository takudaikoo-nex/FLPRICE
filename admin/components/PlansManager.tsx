import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Item, Plan, PlanCategory, PlanId } from '../../types';
import { Edit, Trash2, Plus, X } from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import VirtualItemSelector from '../../components/ui/VirtualItemSelector';
import { convertDbItem, convertDbPlan } from '../../lib/converter';

import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const SortablePlanCard = ({ plan, onEdit, onDelete }: { plan: Plan; onEdit: (p: Plan) => void; onDelete: (id: string) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: plan.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow'>
            <div className='flex gap-3'>
                <button
                    {...attributes}
                    {...listeners}
                    className='mt-1 shrink-0 text-gray-400 hover:text-emerald-600 cursor-grab active:cursor-grabbing'
                    title='ドラッグで並び替え'
                >
                    <GripVertical size={20} />
                </button>
                <div className='flex-1'>
                    <div className='flex justify-between items-start mb-2'>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${plan.category === 'cremation' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {plan.category === 'cremation' ? '火葬式' : '葬儀'}
                        </span>
                        <div className='flex gap-2'>
                        <button onClick={() => onEdit(plan)} className='p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors'><Edit size={18} /></button>
                        <button onClick={() => onDelete(plan.id)} className='p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'><Trash2 size={18} /></button>
                    </div>
                </div>
                <h4 className='text-lg font-bold text-gray-800 mb-1'>{plan.name}</h4>
                <p className='text-2xl font-bold text-emerald-600 mb-3'>¥{plan.price.toLocaleString()}</p>
                <p className='text-sm text-gray-500 line-clamp-2'>{plan.description}</p>
                <div className='mt-3 text-xs text-gray-400'>ID: {plan.id}</div>
                </div>
            </div>
        </div>
    );
};


const PlansManager: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [linkedItems, setLinkedItems] = useState<Set<number>>(new Set());
    const [includedItems, setIncludedItems] = useState<Set<number>>(new Set());
    const [isNew, setIsNew] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansResult, itemsResult] = await Promise.all([
                supabase.from('plans').select('*').order('display_order', { ascending: true }),
                supabase.from('items').select('*').order('display_order')
            ]);

            if (plansResult.error) throw plansResult.error;
            if (itemsResult.error) throw itemsResult.error;

            setPlans((plansResult.data || []).map(convertDbPlan));
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

            // 2. Update Item Linkages (allowedPlans + includedInPlans)
            const updates = items.map(item => {
                const isLinked = linkedItems.has(item.id);
                const wasLinked = item.allowedPlans.includes(editingPlan.id);
                const isIncluded = includedItems.has(item.id);
                const wasIncluded = item.includedInPlans.includes(editingPlan.id);

                if (isLinked !== wasLinked || isIncluded !== wasIncluded) {
                    const newAllowed = isLinked
                        ? (wasLinked ? item.allowedPlans : [...item.allowedPlans, editingPlan.id])
                        : item.allowedPlans.filter(p => p !== editingPlan.id);
                    // includedInPlans はallowedPlansに含まれるもののみ
                    const newIncluded = isIncluded && isLinked
                        ? (wasIncluded ? item.includedInPlans : [...item.includedInPlans, editingPlan.id])
                        : item.includedInPlans.filter(p => p !== editingPlan.id);
                    return { ...item, allowedPlans: newAllowed, includedInPlans: newIncluded };
                }
                return null;
            }).filter(Boolean);

            if (updates.length > 0) {
                await Promise.all(updates.map(async (item: any) => {
                    await supabase.from('items').update({
                        allowed_plans: item.allowedPlans,
                        included_in_plans: item.includedInPlans,
                    }).eq('id', item.id);
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


    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = plans.findIndex(p => p.id === active.id);
        const newIndex = plans.findIndex(p => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(plans, oldIndex, newIndex);
        setPlans(reordered);

        try {
            const updates = reordered.map((plan, idx) => ({
                id: plan.id,
                display_order: idx + 1,
            }));

            for (const u of updates) {
                const { error } = await supabase
                    .from('plans')
                    .update({ display_order: u.display_order })
                    .eq('id', u.id);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error reordering plans:', error);
            alert('並び替えに失敗しました');
            await fetchData();
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
        const linked = new Set<number>();
        const included = new Set<number>();
        items.forEach(item => {
            if (item.allowedPlans.includes(plan.id)) {
                linked.add(item.id);
            }
            if (item.includedInPlans.includes(plan.id)) {
                included.add(item.id);
            }
        });
        setLinkedItems(linked);
        setIncludedItems(included);
        setIsNew(false);
    };

    const startNew = () => {
        setEditingPlan({
            id: '' as PlanId,
            name: '',
            price: 0,
            category: 'cremation' as PlanCategory,
            description: ''
        });
        setLinkedItems(new Set());
        setIncludedItems(new Set());
        setIsNew(true);
    };

    const toggleItemLink = (itemId: number) => {
        const newLinked = new Set(linkedItems);
        if (newLinked.has(itemId)) {
            newLinked.delete(itemId);
            // allowedから外れたらincludedも外す
            const newIncluded = new Set(includedItems);
            newIncluded.delete(itemId);
            setIncludedItems(newIncluded);
        } else {
            newLinked.add(itemId);
        }
        setLinkedItems(newLinked);
    };

    const toggleItemIncluded = (itemId: number) => {
        const newIncluded = new Set(includedItems);
        if (newIncluded.has(itemId)) {
            newIncluded.delete(itemId);
        } else {
            newIncluded.add(itemId);
        }
        setIncludedItems(newIncluded);
    };

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
                                                placeholder="例: plan_01"
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
                                            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                                            <select
                                                value={editingPlan.category}
                                                onChange={e => setEditingPlan({ ...editingPlan, category: e.target.value as PlanCategory })}
                                                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                            >
                                                <option value="cremation">火葬式 (cremation)</option>
                                                <option value="funeral">葬儀 (funeral)</option>
                                            </select>
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
                                            <p className="text-sm text-gray-500 mb-2">
                                                対象: <span className="font-bold text-emerald-600 text-lg">{linkedItems.size}</span> 個
                                                ／ 含む: <span className="font-bold text-blue-600 text-lg">{includedItems.size}</span> 個
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
                        <div className="space-y-2 p-2">
                            {items.map(item => {
                                const isLinked = linkedItems.has(item.id);
                                const isIncluded = includedItems.has(item.id);
                                return (
                                    <div key={item.id} className={`p-3 rounded-lg border ${isLinked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isLinked}
                                                onChange={() => toggleItemLink(item.id)}
                                                className="accent-emerald-600 w-4 h-4"
                                            />
                                            <div className="flex-1">
                                                <span className="font-medium text-sm">{item.name}</span>
                                                <span className="text-xs text-gray-400 ml-2">ID: {item.id}</span>
                                            </div>
                                            {isLinked && (
                                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isIncluded}
                                                        onChange={() => toggleItemIncluded(item.id)}
                                                        className="accent-blue-600 w-3.5 h-3.5"
                                                    />
                                                    <span className={isIncluded ? 'text-blue-600 font-bold' : 'text-gray-400'}>
                                                        含む
                                                    </span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Drawer>
                </>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={plans.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plans.map(plan => (
                            <SortablePlanCard key={plan.id} plan={plan} onEdit={startEdit} onDelete={handleDelete} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

export default PlansManager;
