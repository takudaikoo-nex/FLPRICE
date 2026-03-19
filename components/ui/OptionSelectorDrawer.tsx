import React, { useState, useMemo } from 'react';
import Drawer from './Drawer';
import { List } from 'react-window';
import { Search, Check, Image as ImageIcon } from 'lucide-react';
interface DropdownOption {
    id: string;
    name: string;
    price: number;
}

interface OptionSelectorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    options: DropdownOption[];
    selectedOptionId: string | undefined;
    onSelect: (optionId: string) => void;
    itemName: string;
}

const Row = ({ index, style, options, selectedOptionId, onSelect }: any) => {
    const option = options[index];
    const isSelected = selectedOptionId === option.id;

    return (
        <div style={style} className="px-4 py-2">
            <div
                onClick={() => onSelect(option.id)}
                className={`
                    w-full flex items-center p-3 rounded-lg cursor-pointer border transition-all active:scale-[0.98]
                    ${isSelected
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                    }
                `}
            >
                {/* Image Placeholder (for future) */}
                <div className={`
                    w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 mr-3 border border-gray-100
                    ${isSelected ? 'bg-emerald-100/50' : ''}
                `}>
                    <ImageIcon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`font-bold text-sm ${isSelected ? 'text-emerald-900' : 'text-gray-800'}`}>
                            {option.name}
                        </span>
                        {isSelected && <Check size={16} className="text-emerald-600 ml-2 flex-shrink-0" />}
                    </div>
                    <div className="text-sm font-mono text-gray-500">
                        +¥{option.price.toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const OptionSelectorDrawer: React.FC<OptionSelectorDrawerProps> = ({
    isOpen,
    onClose,
    title,
    options,
    selectedOptionId,
    onSelect,
    itemName
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lower = searchTerm.toLowerCase();
        return options.filter(opt => opt.name.toLowerCase().includes(lower));
    }, [options, searchTerm]);

    const handleSelect = (id: string) => {
        onSelect(id);
        onClose(); // Auto close on select
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={itemName}
            width="md:w-[480px]"
        >
            <div className="h-full flex flex-col">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm text-gray-500 mb-3">
                        {title}
                    </p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="オプションを検索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                        />
                    </div>
                </div>

                <div className="flex-1 w-full bg-white">
                    {filteredOptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <Search size={32} className="mb-2 opacity-50" />
                            <span className="text-sm">条件に一致するオプションはありません</span>
                        </div>
                    ) : (
                        <List
                            style={{ height: window.innerHeight * 0.7, width: '100%' }}
                            rowCount={filteredOptions.length}
                            rowHeight={80}
                            rowComponent={Row}
                            rowProps={{
                                options: filteredOptions,
                                selectedOptionId,
                                onSelect: handleSelect
                            }}
                            className="w-full"
                        />
                    )}
                </div>

                {/* Reset Button */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={() => handleSelect('')}
                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        選択を解除する (未選択に戻す)
                    </button>
                </div>
            </div>
        </Drawer>
    );
};

export default OptionSelectorDrawer;
