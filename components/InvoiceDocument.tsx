import React from 'react';
import { Plan, Item } from '../types';
import { COMPANY_INFO } from '../constants';

interface InvoiceDocumentProps {
    plan: Plan;
    items: Item[];
    optionValues: Map<number, number>;
    totalCost: number;
    customerInfo?: any;
    estimateId?: number;
    logoType: 'FL' | 'LS';
}

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
    plan,
    items,
    optionValues,
    totalCost,
    customerInfo,
    estimateId,
    logoType
}) => {
    const info = COMPANY_INFO[logoType];

    const today = new Date();
    const formattedDate = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 7);
    const formattedDeadline = deadline.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    // オプションのうち金額が入っているもの
    const activeOptions = items
        .map(item => ({ item, value: optionValues.get(item.id) ?? 0 }))
        .filter(({ value }) => value > 0);

    const optionsTotal = activeOptions.reduce((sum, { value }) => sum + value, 0);

    // 全行
    const allRows = [
        { name: `基本プラン（${plan.name}）`, price: plan.price, detail: '' },
        ...activeOptions.map(({ item, value }) => ({
            name: item.name,
            price: value,
            detail: '',
        }))
    ];

    return (
        <div
            id="invoice-document"
            className="w-[210mm] h-[297mm] bg-white text-gray-900 overflow-hidden relative leading-relaxed flex flex-col"
            style={{
                padding: '15mm 20mm',
                boxSizing: 'border-box',
                fontFamily: '"Yu Mincho", "YuMincho", serif',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
            }}
        >
            {/* Header */}
            <h1 className="text-3xl font-bold text-center border-b-2 border-black pb-2 mb-8 tracking-widest">
                ご 請 求 書
            </h1>

            <div className="text-right mb-4">
                <div className="text-sm">発行日: {formattedDate}</div>
            </div>

            {/* Top Layout */}
            <div className="grid grid-cols-2 gap-8 mb-8" style={{ marginTop: '15px' }}>
                {/* Left: Customer Info */}
                <div>
                    <div className="border-b border-black bg-gray-100 py-1 px-2 text-sm font-bold mb-4 !print-color-adjust-exact">
                        お客様情報
                    </div>
                    <div className="px-2">
                        <div className="mb-3">
                            <div className="text-sm leading-relaxed break-words">
                                <div>〒{(customerInfo?.applicantAddress || customerInfo?.chiefMournerAddress)?.split(' ')[0]?.replace('〒', '') || '　　-　　'}</div>
                                <div className="mt-1 break-words">{(customerInfo?.applicantAddress || customerInfo?.chiefMournerAddress)?.split(' ').slice(1).join(' ') || ''}</div>
                            </div>
                        </div>
                        <div className="mb-3">
                            <div className="text-xl font-bold border-b border-black inline-block pr-12 pb-1 break-words max-w-full">
                                {customerInfo?.applicantName || '　　　　'} 様
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-0.5">お電話番号</div>
                            <div className="text-sm">
                                {customerInfo?.applicantPhone || customerInfo?.chiefMournerMobile || customerInfo?.chiefMournerPhone || ''}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Company Info */}
                <div className="text-right relative">
                    <div className="font-bold text-lg mb-1">{info.name}</div>
                    <div className="text-xs leading-relaxed text-gray-600">
                        <div>{info.address}</div>
                        <div>{info.contact}</div>
                        <div className="mt-1">{info.rep}</div>
                        {(info as any).registrationNumber && (
                            <div className="mt-1 text-[10px] text-gray-500">事業者登録番号: {(info as any).registrationNumber}</div>
                        )}
                    </div>
                    {info.stamp && (
                        <img src={info.stamp} alt="Stamp" className="absolute object-contain opacity-80" style={{ width: '60px', height: '60px', right: '0px', top: '10px' }} />
                    )}
                </div>
            </div>

            {/* Billing Statement & Total */}
            <div className="mb-12" style={{ marginTop: '20px' }}>
                <div className="text-sm mb-4">下記のとおりご請求申し上げます。</div>
                <div className="inline-block pr-12 pb-2 bg-gray-100 px-4 !print-color-adjust-exact" style={{ borderBottom: '3px solid black' }}>
                    <span className="font-bold text-xl">ご請求金額</span>
                    <span className="font-bold text-4xl font-mono">　　　¥{totalCost.toLocaleString()} -</span>
                    <span className="text-sm ml-2">(税込)</span>
                </div>
            </div>

            {/* Main Table */}
            <div className="mb-8" style={{ marginTop: '20px' }}>
                <div className="border border-black text-sm">
                    <div className="flex bg-gray-100 font-bold border-b border-black !print-color-adjust-exact">
                        <div className="flex-1 text-left py-1 px-2 border-r border-black">内訳 / 項目名</div>
                        <div className="flex-1 text-right py-1 px-2">金額（税込）</div>
                    </div>

                    <div>
                        {allRows.map((row, index) => (
                            <div key={index} className="flex border-b border-black last:border-0">
                                <div className="flex-1 text-left py-2 px-2 border-r border-black truncate">{row.name}</div>
                                <div className="flex-1 text-right py-2 px-2 font-mono">¥{row.price.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Subtotals */}
                <div className="flex flex-col items-end mt-4 text-sm">
                    <div className="flex justify-between w-[250px] border-b border-gray-300 py-1" style={{ borderTop: '1px solid #374151' }}>
                        <span>プラン料金</span>
                        <span className="font-mono">¥{plan.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between w-[250px] border-b border-gray-300 py-1">
                        <span>オプション計</span>
                        <span className="font-mono">¥{optionsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between w-[250px] border-b-2 border-black py-2 font-bold">
                        <span>合計（税込）</span>
                        <span className="font-mono">¥{totalCost.toLocaleString()}</span>
                    </div>
                    <p className="text-[8pt] text-gray-400 mt-1">※ 金額は全て税込表示です</p>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1 min-h-[20px]"></div>

            {/* Bank Info */}
            <div className="mb-12" style={{ marginTop: '20px' }}>
                <div className="border-b border-black bg-gray-100 py-1 px-2 text-sm font-bold mb-2 !print-color-adjust-exact">お振込先</div>
                <div className="ml-4 text-sm leading-relaxed">
                    <div className="font-medium text-base mb-2">
                        {info.bankInfo.split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                    <div className="text-xs text-gray-500">
                        <p>※お振込手数料はお客様負担にてお願いいたします。</p>
                        <p className="mt-1">※お支払期限: <span className="font-bold text-black text-sm">{formattedDeadline}</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDocument;
