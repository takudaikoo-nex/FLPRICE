import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Edit } from 'lucide-react';
interface AttendeeOption {
    tier: string;
    label: string;
    description: string;
}

const AttendeesManager: React.FC = () => {
    const [attendees, setAttendees] = useState<AttendeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<AttendeeOption | null>(null);

    useEffect(() => {
        fetchAttendees();
    }, []);

    const fetchAttendees = async () => {
        try {
            const { data, error } = await supabase
                .from('attendee_options')
                .select('*')
                .order('tier');

            if (error) throw error;
            setAttendees(data || []);
        } catch (error) {
            console.error('Error fetching attendees:', error);
            alert('参列人数設定の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingItem) return;

        try {
            const { error } = await supabase
                .from('attendee_options')
                .update({
                    label: editingItem.label,
                    description: editingItem.description
                })
                .eq('tier', editingItem.tier);

            if (error) throw error;

            await fetchAttendees();
            setEditingItem(null);
        } catch (error: any) {
            console.error('Error saving attendee option:', error);
            alert(`保存に失敗しました: ${error.message}`);
        }
    };

    if (loading) return <div className="p-4">読み込み中...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-700">参列人数設定</h3>
            </div>

            {editingItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <h3 className="text-xl font-bold mb-4">
                            設定編集 (ランク {editingItem.tier})
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">表示ラベル</label>
                                <input
                                    type="text"
                                    value={editingItem.label}
                                    onChange={e => setEditingItem({ ...editingItem, label: e.target.value })}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                                <textarea
                                    value={editingItem.description}
                                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                保存する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 w-24">ランク</th>
                            <th className="p-4">表示ラベル</th>
                            <th className="p-4">説明</th>
                            <th className="p-4 w-24 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {attendees.map(item => (
                            <tr key={item.tier} className="hover:bg-gray-50">
                                <td className="p-4 font-mono font-bold text-gray-600">{item.tier}</td>
                                <td className="p-4 font-bold text-gray-800">{item.label}</td>
                                <td className="p-4 text-gray-600">{item.description}</td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => setEditingItem({ ...item })}
                                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    >
                                        <Edit size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                ℹ️ ランク（A, B, C, D）の追加・削除はできません。表示名と説明のみ編集可能です。
            </div>
        </div>
    );
};

export default AttendeesManager;
