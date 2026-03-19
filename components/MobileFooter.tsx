import React from 'react';
import { Printer } from 'lucide-react';

interface MobileFooterProps {
    total: number;
    onInputClick: () => void;
    onOutputClick: () => void;
    onInvoiceClick: () => void;
}

const MobileFooter: React.FC<MobileFooterProps> = ({ total, onInputClick, onOutputClick, onInvoiceClick }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] py-3 px-4 z-40 print:hidden">
            <div className="flex flex-col gap-3">
                <div className="text-gray-800 flex items-center justify-between w-full">
                    <span className="text-sm font-bold mr-2">概算額(税込)</span>
                    <span className="font-extrabold text-emerald-700 tracking-tight leading-none text-3xl">¥{total.toLocaleString()}</span>
                </div>
                <div className="flex gap-2 w-full justify-between">
                    {/* Customer Input Button */}
                    <button
                        onClick={onInputClick}
                        className="flex-1 flex items-center justify-center gap-1 bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-2 py-2 rounded-lg font-bold text-xs shadow-sm transition-all"
                    >
                        <span>📝 入力</span>
                    </button>

                    {/* Direct Output Button */}
                    <button
                        onClick={onOutputClick}
                        className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-2 rounded-lg font-bold text-xs shadow-md active:scale-95 transition-all"
                    >
                        <Printer size={16} />
                        <span>見積</span>
                    </button>

                    {/* Invoice Output Button */}
                    <button
                        onClick={onInvoiceClick}
                        className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-2 rounded-lg font-bold text-xs shadow-md active:scale-95 transition-all"
                    >
                        <Printer size={16} />
                        <span>請求</span>
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default MobileFooter;
