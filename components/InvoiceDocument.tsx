import React from 'react';
import { Plan, Item } from '../types';
import { COMPANY_INFO } from '../constants';
import { getItemPrice, TAX_RATE } from '../lib/pricing';

interface InvoiceDocumentProps {
    plan: Plan;
    items: Item[];
    selectedOptions: Set<number>;
    selectedGrades: Map<number, string>;
    freeInputValues: Map<number, number>;
    totalCost: number;
    customerInfo?: any;
    estimateId?: number;
    logoType: 'FL' | 'LS';
}

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
    plan, items, selectedOptions, selectedGrades, freeInputValues,
    customerInfo, logoType
}) => {
    const info = COMPANY_INFO[logoType];
    const today = new Date();
    const formattedDate = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const deadline = new Date(today); deadline.setDate(deadline.getDate() + 7);
    const formattedDeadline = deadline.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    const planId = plan.id;
    const getPrice = (item: Item) => getItemPrice(item, planId, selectedOptions, selectedGrades, freeInputValues);

    const activeOptions = items.filter(i => {
        if (!i.allowedPlans.includes(planId)) return false;
        if (i.includedInPlans.includes(planId)) {
            if (i.type === 'dropdown' && selectedGrades.has(i.id)) return true;
            return false;
        }
        return getPrice(i) > 0;
    });

    const taxableOptions = activeOptions.filter(i => !i.nonTaxable);
    const nonTaxableOptions = activeOptions.filter(i => i.nonTaxable);
    const taxableOptionsTotal = taxableOptions.reduce((sum, i) => sum + getPrice(i), 0);
    const nonTaxableTotal = nonTaxableOptions.reduce((sum, i) => sum + getPrice(i), 0);
    const taxableSubtotal = plan.price + taxableOptionsTotal;
    const taxAmount = Math.floor(taxableSubtotal * TAX_RATE);
    const finalTotal = taxableSubtotal + taxAmount + nonTaxableTotal;

    const getGradeLabel = (item: Item): string => {
        const gradeId = selectedGrades.get(item.id);
        if (gradeId && item.options) return item.options.find(o => o.id === gradeId)?.name || '';
        return '';
    };

    const includedItems = items.filter(i => i.allowedPlans.includes(planId) && i.includedInPlans.includes(planId));

    const taxableRows = [
        { name: `基本プラン (${plan.name})`, price: plan.price, detail: '', isIncluded: false },
        ...includedItems.map(i => ({ name: i.name, price: 0, detail: '', isIncluded: true })),
        ...taxableOptions.map(i => ({ name: i.name, price: getPrice(i), detail: getGradeLabel(i), isIncluded: false })),
    ];

    return (
        <div id="invoice-document" className="w-[210mm] h-[297mm] bg-white text-gray-900 overflow-hidden relative leading-relaxed flex flex-col"
            style={{ padding: '15mm 20mm', boxSizing: 'border-box', fontFamily: '"Yu Mincho", "YuMincho", serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>

            <h1 className="text-3xl font-bold text-center border-b-2 border-black pb-2 mb-8 tracking-widest">ご 請 求 書</h1>
            <div className="text-right mb-4"><div className="text-sm">発行日: {formattedDate}</div></div>

            <div className="grid grid-cols-2 gap-8 mb-8" style={{ marginTop: '15px' }}>
                <div>
                    <div className="border-b border-black bg-gray-100 py-1 px-2 text-sm font-bold mb-4 !print-color-adjust-exact">お客様情報</div>
                    <div className="px-2">
                        <div className="mb-3 text-sm leading-relaxed break-words">
                            <div>〒{(customerInfo?.applicantAddress || customerInfo?.chiefMournerAddress)?.split(' ')[0]?.replace('〒', '') || '　　-　　'}</div>
                            <div className="mt-1 break-words">{(customerInfo?.applicantAddress || customerInfo?.chiefMournerAddress)?.split(' ').slice(1).join(' ') || ''}</div>
                        </div>
                        <div className="mb-3"><div className="text-xl font-bold border-b border-black inline-block pr-12 pb-1">{customerInfo?.applicantName || '　　　　'} 様</div></div>
                        <div><div className="text-xs text-gray-500 mb-0.5">お電話番号</div><div className="text-sm">{customerInfo?.applicantPhone || customerInfo?.chiefMournerMobile || ''}</div></div>
                    </div>
                </div>
                <div className="text-right relative">
                    <div className="font-bold text-lg mb-1">{info.name}</div>
                    <div className="text-xs leading-relaxed text-gray-600">
                        <div>{info.address}</div><div>{info.contact}</div><div className="mt-1">{info.rep}</div>
                        {(info as any).registrationNumber && <div className="mt-1 text-[10px] text-gray-500">事業者登録番号: {(info as any).registrationNumber}</div>}
                    </div>
                    {info.stamp && <img src={info.stamp} alt="Stamp" className="absolute object-contain opacity-80" style={{ width: '60px', height: '60px', right: '0px', top: '10px' }} />}
                </div>
            </div>

            <div className="mb-12" style={{ marginTop: '20px' }}>
                <div className="text-sm mb-4">下記のとおりご請求申し上げます。</div>
                <div className="inline-block pr-12 pb-2 bg-gray-100 px-4 !print-color-adjust-exact" style={{ borderBottom: '3px solid black' }}>
                    <span className="font-bold text-xl">ご請求金額</span>
                    <span className="font-bold text-4xl font-mono">　　　¥{finalTotal.toLocaleString()} -</span>
                    <span className="text-sm ml-2">(税込)</span>
                </div>
            </div>

            <div className="mb-8" style={{ marginTop: '20px' }}>
                <div className="border border-black text-sm">
                    <div className="flex bg-gray-100 font-bold border-b border-black !print-color-adjust-exact">
                        <div className="flex-1 text-left py-1 px-2 border-r border-black">内訳 / 項目名</div>
                        <div className="w-[20%] text-center py-1 px-2 border-r border-black">詳細</div>
                        <div className="flex-1 text-right py-1 px-2">金額 (税抜)</div>
                    </div>
                    <div>
                        {taxableRows.map((row, i) => (
                            <div key={i} className="flex border-b border-black last:border-0">
                                <div className="flex-1 text-left py-2 px-2 border-r border-black truncate">{row.name}</div>
                                <div className="w-[20%] text-center py-2 px-2 border-r border-black truncate text-gray-600">{row.detail}</div>
                                <div className="flex-1 text-right py-2 px-2 font-mono">{row.isIncluded ? 'プラン内' : `¥${row.price.toLocaleString()}`}</div>
                            </div>
                        ))}
                    </div>
                    {nonTaxableOptions.length > 0 && (
                        <>
                            <div className="flex bg-gray-100 font-bold border-y border-black !print-color-adjust-exact"><div className="flex-1 text-left py-1 px-2">非課税対象</div><div className="w-[20%] border-l border-black"></div><div className="flex-1 border-l border-black"></div></div>
                            <div>{nonTaxableOptions.map((item, i) => (
                                <div key={`nt-${i}`} className="flex border-b border-black last:border-0">
                                    <div className="flex-1 text-left py-2 px-2 border-r border-black">{item.name}</div>
                                    <div className="w-[20%] text-center py-2 px-2 border-r border-black"></div>
                                    <div className="flex-1 text-right py-2 px-2 font-mono">¥{getPrice(item).toLocaleString()}</div>
                                </div>
                            ))}</div>
                        </>
                    )}
                </div>
                <div className="flex flex-col items-end mt-4 text-sm">
                    <div className="flex justify-between w-[250px] border-b border-gray-300 py-1" style={{ borderTop: '1px solid #374151' }}><span>小計 (税抜)</span><span className="font-mono">¥{taxableSubtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between w-[250px] border-b border-gray-300 py-1"><span>消費税 (10%)</span><span className="font-mono">¥{taxAmount.toLocaleString()}</span></div>
                    {nonTaxableTotal > 0 && <div className="flex justify-between w-[250px] border-b border-gray-300 py-1"><span>非課税計</span><span className="font-mono">¥{nonTaxableTotal.toLocaleString()}</span></div>}
                    <div className="flex justify-between w-[250px] border-b-2 border-black py-2 font-bold"><span>合計 (税込み)</span><span className="font-mono">¥{finalTotal.toLocaleString()}</span></div>
                </div>
            </div>

            <div className="flex-1 min-h-[20px]"></div>

            <div className="mb-12" style={{ marginTop: '20px' }}>
                <div className="border-b border-black bg-gray-100 py-1 px-2 text-sm font-bold mb-2 !print-color-adjust-exact">お振込先</div>
                <div className="ml-4 text-sm leading-relaxed">
                    <div className="font-medium text-base mb-2">{info.bankInfo.split('\n').map((line, i) => <div key={i}>{line}</div>)}</div>
                    <div className="text-xs text-gray-500"><p>※お振込手数料はお客様負担にてお願いいたします。</p><p className="mt-1">※お支払期限: <span className="font-bold text-black text-sm">{formattedDeadline}</span></p></div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDocument;
