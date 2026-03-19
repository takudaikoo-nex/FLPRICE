import React, { useState, useMemo } from 'react';
import { List } from 'react-window';
import { Search, Check } from 'lucide-react';
import { Item } from '../../types'; // Adjust path as needed, assuming types.ts is in src root or equivalent

interface VirtualItemSelectorProps {
    items: Item[];
    selectedIds: Set<number>;
    onToggle: (itemId: number) => void;
    height?: number; // Optional custom height
}

const Row = ({ index, style, items, selectedIds, onToggle }: any) => {
    const item = items[index];
    const isSelected = selectedIds.has(item.id);

    return (
        <div style={style} className="px-4 py-2">
            <div
                onClick={() => onToggle(item.id)}
                className={`
                    w-full flex items-start p-3 rounded-lg cursor-pointer border transition-all active:scale-[0.99]
                    ${isSelected
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                    }
                `}
            >
                <div className={`
                    flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors mr-3
                    ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}
                `}>
                    {isSelected && <Check size={14} className="text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <span className={`font-bold text-sm ${isSelected ? 'text-emerald-900' : 'text-gray-700'}`}>
                            {item.name}
                        </span>
                        <span className="text-xs font-mono text-gray-500 ml-2">
                            {item.basePrice > 0 ? `¥${item.basePrice.toLocaleString()}` : '¥0'}
                        </span>
                    </div>
                    {item.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {item.description}
                        </p>
                    )}
                    <div className="mt-1 flex gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${item.type === 'included' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                item.type === 'checkbox' ? 'bg-green-50 text-green-600 border-green-100' :
                                    'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                            {item.type}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VirtualItemSelector: React.FC<VirtualItemSelectorProps> = ({
    items,
    selectedIds,
    onToggle,
    height = 600
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        const lower = searchTerm.toLowerCase();
        return items.filter(item =>
            item.name.toLowerCase().includes(lower) ||
            item.description?.toLowerCase().includes(lower)
        );
    }, [items, searchTerm]);

    return (
        <div className="h-full flex flex-col">
            {/* Search Bar */}
            <div className="p-4 bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="アイテムを検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                </div>
                <div className="mt-2 text-xs text-gray-400 text-right">
                    {filteredItems.length}件 / 全{items.length}件
                </div>
            </div>

            {/* Virtualized List */}
            <div className="flex-1 w-full">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <Search size={32} className="mb-2 opacity-50" />
                        <span className="text-sm">条件に一致するアイテムはありません</span>
                    </div>
                ) : (
                    <List
                        style={{ height, width: '100%' }}
                        rowCount={filteredItems.length}
                        rowHeight={100}
                        rowComponent={Row}
                        rowProps={{
                            items: filteredItems,
                            selectedIds,
                            onToggle
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default VirtualItemSelector;
