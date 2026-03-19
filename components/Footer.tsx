import React from 'react';
import { Printer } from 'lucide-react';

interface FooterProps {
  total: number;
  onInputClick: () => void;
  onOutputClick: () => void;
  onInvoiceClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ total, onInputClick, onOutputClick, onInvoiceClick }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] py-5 px-8 z-40 print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="text-gray-800 flex items-baseline">
          <span className="text-3xl font-bold mr-4">お見積り概算額 (税込)</span>
          <span className="font-extrabold text-emerald-700 tracking-tight leading-none" style={{ fontSize: '3.5rem' }}>¥{total.toLocaleString()}</span>
        </div>
        <div className="flex gap-4">
          {/* Customer Input Button */}
          <button
            onClick={onInputClick}
            className="flex items-center gap-3 bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-6 py-4 rounded-full font-bold text-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <span>📝 顧客情報入力</span>
          </button>

          {/* Direct Output Button */}
          <button
            onClick={onOutputClick}
            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-bold text-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <Printer size={28} />
            <span>見積書出力</span>
          </button>

          {/* Invoice Output Button */}
          <button
            onClick={onInvoiceClick}
            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-bold text-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <Printer size={28} />
            <span>請求書出力</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;