import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Item, ItemType, Plan } from '../../types';
import { Edit, Trash2, Plus, Search, GripVertical, Copy } from 'lucide-react';
import { ITEM_TYPE_LABEL } from './itemTypes';
import ItemEditor from './ItemEditor';
import { convertDbItem, convertItemToDb, convertDbPlan } from '../../lib/converter';
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
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps {
    item: Item;
    onEdit: (item: Item) => void;
    onCopy: (item: Item) => void;
    onDelete: (item: Item) => void;
    isFiltered: boolean;
}

const SortableRow: React.FC<SortableRowProps> = ({ item, onEdit, onCopy, onDelete, isFiltered }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id, disabled: isFiltered });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
        backgroundColor: isDragging ? '#f0fdf4' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
            <td className="p-4 text-center">
                <button
                    {...attributes}
                    {...listeners}
                    className={`cursor-grab active:cursor-grabbing text-gray-400 hover:text-emerald-600 ${isFiltered ? 'opacity-30 cursor-not-allowed' : ''}`}
                    disabled={isFiltered}
                    title={isFiltered ? '検索中はドラッグ無効' : 'ドラッグで並び替え'}
                >
                    <GripVertical size={18} />
                </button>
            </td>
            <td className="p-4 font-mono text-sm text-gray-500">{item.id}</td>
            <td className="p-4 font-bold text-gray-800">
                {item.name}
                <div className="text-xs font-normal text-gray-400 mt-0.5 truncate max-w-xs">
                    {item.description}
                </div>
            </td>
            <td className="p-4">
                <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
                    item.type === 'multi_grade'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                }`}>
                    {ITEM_TYPE_LABEL[item.type as ItemType] || item.type}
                </span>
                {/* 選択肢を持つ種別は数がひと目で分かるようにする */}
                {(item.options?.length ?? 0) > 0 && (
                    <div className="text-[10px] text-gray-400 mt-1">{item.options!.length}件の選択肢</div>
                )}
            </td>
            <td className="p-4 text-right font-mono text-sm">
                {item.basePrice ? `¥${item.basePrice.toLocaleString()}` : '¥0'}
            </td>
            <td className="p-4">
                <div className="flex gap-1 flex-wrap">
                    {item.allowedPlans.map(p => (
                        <span key={p} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 uppercase">
                            {p}
                        </span>
                    ))}
                </div>
            </td>
            <td className="p-4">
                <div className="flex gap-1 flex-wrap">
                    {item.includedInPlans.map(p => (
                        <span key={p} className="text-xs bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 text-blue-700 uppercase">
                            {p}
                        </span>
                    ))}
                </div>
            </td>
            <td className="p-4 text-center">
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => onEdit(item)}
                        title="編集"
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={() => onCopy(item)}
                        title="コピー（すぐ下に追加されます）"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(item)}
                        title="削除"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

const ItemsManager: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsResult, plansResult] = await Promise.all([
                supabase.from('items').select('*').order('display_order', { ascending: true }),
                supabase.from('plans').select('*').order('id'),
            ]);

            if (itemsResult.error) throw itemsResult.error;
            if (plansResult.error) throw plansResult.error;

            setItems((itemsResult.data || []).map(convertDbItem));
            setPlans((plansResult.data || []).map(convertDbPlan));
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (savedItem: Item) => {
        try {
            const dbItem = convertItemToDb(savedItem);

            if (isNew) {
                const { error } = await supabase
                    .from('items')
                    .insert([dbItem]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('items')
                    .update(dbItem)
                    .eq('id', savedItem.id);
                if (error) throw error;
            }

            await fetchData();
            setEditingItem(null);
            setIsNew(false);
        } catch (error: any) {
            console.error('Error saving item:', error);
            alert(`保存に失敗しました: ${error.message}`);
        }
    };

    /** 並んでいる順に display_order を 1 から振り直す */
    const persistOrder = async (ordered: Item[]) => {
        for (const [idx, item] of ordered.entries()) {
            const { error } = await supabase
                .from('items')
                .update({ display_order: idx + 1 })
                .eq('id', item.id);
            if (error) throw error;
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(items, oldIndex, newIndex);
        setItems(reordered);

        try {
            await persistOrder(reordered);
        } catch (error) {
            console.error('Error reordering items:', error);
            alert('並び替えに失敗しました');
            await fetchData();
        }
    };

    /** アイテムを複製して、コピー元のすぐ下に置く */
    const handleCopy = async (item: Item) => {
        if (!confirm(`「${item.name}」をコピーしますか？\nコピーはすぐ下の順序に追加されます。`)) return;

        const index = items.findIndex(i => i.id === item.id);
        if (index === -1) return;

        const maxId = items.reduce((max, i) => Math.max(max, i.id), 0);
        const copied: Item = {
            ...JSON.parse(JSON.stringify(item)),
            id: maxId + 1,
            name: `${item.name}のコピー`,
            displayOrder: index + 2,
            // 選択肢のIDはアイテムごとに一意にしておく
            options: item.options?.map((opt, i) => ({
                ...opt,
                id: `opt_${Date.now().toString(36)}_${i}`,
            })),
        };

        try {
            setLoading(true);
            const { error } = await supabase.from('items').insert([convertItemToDb(copied)]);
            if (error) throw error;

            const reordered = [...items];
            reordered.splice(index + 1, 0, copied);
            await persistOrder(reordered);

            await fetchData();
        } catch (error: any) {
            console.error('Error copying item:', error);
            alert(`コピーに失敗しました: ${error.message}`);
            await fetchData();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (item: Item) => {
        if (!confirm(`「${item.name}」を削除しますか？この操作は取り消せません。`)) return;

        try {
            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', item.id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('削除に失敗しました');
        }
    };

    const startEdit = (item: Item) => {
        setEditingItem(JSON.parse(JSON.stringify(item)));
        setIsNew(false);
    };

    const startNew = () => {
        const maxId = items.reduce((max, item) => Math.max(max, item.id), 0);
        const maxOrder = items.reduce((max, item) => Math.max(max, item.displayOrder || 0), 0);

        setEditingItem({
            id: maxId + 1,
            name: '',
            description: '',
            displayOrder: maxOrder + 1,
            type: 'free_input',
            basePrice: 0,
            allowedPlans: [],
            includedInPlans: [],
            nonTaxable: false,
            reducedTax: false,
        });
        setIsNew(true);
    };

    const isFiltered = searchTerm.length > 0;
    const filteredItems = isFiltered
        ? items.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : items;

    const handleSyncFromConstants = async () => {
        if (!confirm('本当に constants.ts のデータでデータベースを上書き同期しますか？\n（現在の管理画面での変更はリセットされます）')) return;

        try {
            setLoading(true);

            const { error: delError } = await supabase.from('items').delete().gt('id', 0);
            if (delError) throw delError;

            const { ITEMS } = await import('../../constants');
            const dataToInsert = ITEMS.map((item, idx) => ({
                ...convertItemToDb(item),
                display_order: idx + 1
            }));

            const { error: insError } = await supabase.from('items').insert(dataToInsert);
            if (insError) throw insError;

            alert('データベースの初期化・同期が完了しました。');
            await fetchData();
        } catch (error: any) {
            console.error('Error syncing items:', error);
            alert(`同期に失敗しました: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4">読み込み中...</div>;

    if (editingItem) {
        return (
            <ItemEditor
                item={editingItem}
                isNew={isNew}
                onSave={handleSave}
                onCancel={() => setEditingItem(null)}
                plans={plans}
            />
        );
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-gray-700">アイテム一覧</h3>

                <div className="flex gap-4 w-full md:w-auto">
                    <button
                        onClick={handleSyncFromConstants}
                        className="flex items-center gap-2 bg-blue-100 text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap border border-blue-300"
                    >
                        データ初期化 (同期)
                    </button>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="検索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={startNew}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                    >
                        <Plus size={18} />
                        新規追加
                    </button>
                </div>
            </div>

            {isFiltered && (
                <div className="mb-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    検索中はドラッグによる並び替えが無効になります。
                </div>
            )}

            <div className="overflow-x-auto">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        <table className="w-full text-left border-collapse bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="p-4 w-12 text-center">順序</th>
                                    <th className="p-4 w-16">ID</th>
                                    <th className="p-4">名前</th>
                                    <th className="p-4 w-32">種別</th>
                                    <th className="p-4 w-32 text-right">初期額</th>
                                    <th className="p-4 w-48">対象プラン</th>
                                    <th className="p-4 w-48">含むプラン</th>
                                    <th className="p-4 w-32 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map(item => (
                                    <SortableRow
                                        key={item.id}
                                        item={item}
                                        onEdit={startEdit}
                                        onCopy={handleCopy}
                                        onDelete={handleDelete}
                                        isFiltered={isFiltered}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};

export default ItemsManager;
