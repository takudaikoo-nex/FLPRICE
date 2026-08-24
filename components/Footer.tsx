import React from 'react';
import { Printer, FileText } from 'lucide-react';

interface FooterProps {
  total: number;
  onInputClick: () => void;
  onOutputClick: () => void;
  onInvoiceClick: () => void;
  onReceiptClick: () => void;
}

/** 画面下に固定する合計バー。ボタンは TOP画面と同じ fl-btn に揃えている */
const Footer: React.FC<FooterProps> = ({ total, onInputClick, onOutputClick, onInvoiceClick, onReceiptClick }) => {
  return (
    <footer className="fl-total-bar print:hidden">
      <div className="fl-total-inner">
        <div className="fl-total-sum">
          <span className="fl-total-label">お見積り概算額（税抜）</span>
          <span className="fl-total-amount">¥{total.toLocaleString()}</span>
        </div>

        <div className="fl-total-actions">
          <button type="button" className="fl-btn fl-btn-ghost" onClick={onInputClick}>
            <FileText size={18} />
            顧客情報入力
          </button>
          <button type="button" className="fl-btn fl-btn-primary" onClick={onOutputClick}>
            <Printer size={18} />
            見積書出力
          </button>
          <button type="button" className="fl-btn fl-btn-primary" onClick={onInvoiceClick}>
            <Printer size={18} />
            請求書出力
          </button>
          <button type="button" className="fl-btn fl-btn-primary" onClick={onReceiptClick}>
            <Printer size={18} />
            領収書出力
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
