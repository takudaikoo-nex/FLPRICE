import React from 'react';
import { Printer, FileText } from 'lucide-react';

interface MobileFooterProps {
    total: number;
    onInputClick: () => void;
    onOutputClick: () => void;
    onInvoiceClick: () => void;
    onReceiptClick: () => void;
}

/** スマートフォン版の合計バー。ボタンは4等分にして指で押せる幅を確保する */
const MobileFooter: React.FC<MobileFooterProps> = ({ total, onInputClick, onOutputClick, onInvoiceClick, onReceiptClick }) => {
    return (
        <footer className="fl-total-bar print:hidden">
            <div className="fl-total-inner">
                <div className="fl-total-sum">
                    <span className="fl-total-label">概算額（税抜）</span>
                    <span className="fl-total-amount">¥{total.toLocaleString()}</span>
                </div>

                <div className="fl-total-actions">
                    <button type="button" className="fl-btn fl-btn-ghost" onClick={onInputClick}>
                        <FileText size={15} />
                        入力
                    </button>
                    <button type="button" className="fl-btn fl-btn-primary" onClick={onOutputClick}>
                        <Printer size={15} />
                        見積
                    </button>
                    <button type="button" className="fl-btn fl-btn-primary" onClick={onInvoiceClick}>
                        <Printer size={15} />
                        請求
                    </button>
                    <button type="button" className="fl-btn fl-btn-primary" onClick={onReceiptClick}>
                        <Printer size={15} />
                        領収
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default MobileFooter;
