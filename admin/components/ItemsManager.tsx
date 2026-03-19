import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Item } from '../../types';
import { Edit, Trash2, Plus, Search, ArrowUp, ArrowDown } from 'lucide-react';
import ItemEditor from './ItemEditor';
import { convertDbItem, convertItemToDb } from '../../lib/converter';

const ItemsManager: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            setItems((data || []).map(convertDbItem));
        } catch (error) {
            console.error('Error fetching items:', error);
            alert('アイテムの取得に失敗しました');
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

            await fetchItems();
            setEditingItem(null);
            setIsNew(false);
        } catch (error: any) {
            console.error('Error saving item:', error);
            alert(`保存に失敗しました: ${error.message}`);
        }
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === items.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const currentItem = items[index];
        const targetItem = items[targetIndex];

        try {
            // Swap display orders
            const { error: error1 } = await supabase
                .from('items')
                .update({ display_order: targetItem.displayOrder })
                .eq('id', currentItem.id);

            if (error1) throw error1;

            const { error: error2 } = await supabase
                .from('items')
                .update({ display_order: currentItem.displayOrder })
                .eq('id', targetItem.id);

            if (error2) throw error2;

            await fetchItems();
        } catch (error) {
            console.error('Error reordering items:', error);
            alert('並び替えに失敗しました');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;

        try {
            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('削除に失敗しました');
        }
    };

    const startEdit = (item: Item) => {
        setEditingItem(JSON.parse(JSON.stringify(item))); // Deep copy
        setIsNew(false);
    };

    const startNew = () => {
        // Find max ID to suggest next ID
        const maxId = items.reduce((max, item) => Math.max(max, item.id), 0);
        const maxOrder = items.reduce((max, item) => Math.max(max, item.displayOrder), 0);

        setEditingItem({
            id: maxId + 1,
            name: '',
            description: '',
            displayOrder: maxOrder + 1,
            basePrice: 0,
            allowedPlans: [],
        });
        setIsNew(true);
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-4">読み込み中...</div>;

    // Show Editor if editing
    if (editingItem) {
        return (
            <ItemEditor
                item={editingItem}
                isNew={isNew}
                onSave={handleSave}
                onCancel={() => setEditingItem(null)}
            />
        );
    }

    // Show List
    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-gray-700">アイテム一覧</h3>

                <div className="flex gap-4 w-full md:w-auto">
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

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 w-12 text-center">順序</th>
                            <th className="p-4 w-16">ID</th>
                            <th className="p-4">名前</th>
                            <th className="p-4 w-32 text-right">初期額</th>
                            <th className="p-4 w-48">対象プラン</th>
                            <th className="p-4 w-24 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={() => handleMove(items.indexOf(item), 'up')}
                                            disabled={items.indexOf(item) === 0}
                                            className="text-gray-400 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleMove(items.indexOf(item), 'down')}
                                            disabled={items.indexOf(item) === items.length - 1}
                                            className="text-gray-400 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                        >
                                            <ArrowDown size={16} />
                                        </button>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-sm text-gray-500">{item.id}</td>
                                <td className="p-4 font-bold text-gray-800">
                                    {item.name}
                                    <div className="text-xs font-normal text-gray-400 mt-0.5 truncate max-w-xs">
                                        {item.description}
                                    </div>
                                </td>
                                <td className="p-4 text-right font-mono text-sm">
                                    {item.basePrice ? `¥${item.basePrice.toLocaleString()}` : '¥0'}
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-1">
                                        {item.allowedPlans.map(p => (
                                            <span key={p} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 uppercase">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => startEdit(item)}
                                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
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

export default ItemsManager;
