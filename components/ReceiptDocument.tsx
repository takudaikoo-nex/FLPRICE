import React from 'react';
import { Plan, Item } from '../types';
import { COMPANY_INFO } from '../constants';
import { getItemPrice, TAX_RATE } from '../lib/pricing';

interface ReceiptDocumentProps {
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

const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
    plan, items, selectedOptions, selectedGrades, freeInputValues,
    customerInfo, logoType
}) => {
    const info = COMPANY_INFO[logoType];
    const today = new Date();
    // Use the funeral Date if provided, otherwise default to today
    const issueDateStr = customerInfo?.funeralDate || today.toISOString().split('T')[0];
    const issueDate = new Date(issueDateStr);
    
    // Fallback: If formatting fails, just use the string
    const formatJapaneseDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formattedIssueDate = formatJapaneseDate(issueDateStr);
    const formattedFuneralDate = formatJapaneseDate(customerInfo?.funeralDate) || formatJapaneseDate(customerInfo?.deathDate) || formattedIssueDate;

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

    const allRows = [
        { name: `基本プラン (${plan.name})`, price: plan.price, detail: '', isIncluded: false, nonTaxable: false },
        ...includedItems.map(i => ({ name: i.name, price: 0, detail: '', isIncluded: true, nonTaxable: i.nonTaxable })),
        ...taxableOptions.map(i => ({ name: i.name, price: getPrice(i), detail: getGradeLabel(i), isIncluded: false, nonTaxable: false })),
        ...nonTaxableOptions.map(i => ({ name: i.name, price: getPrice(i), detail: getGradeLabel(i), isIncluded: false, nonTaxable: true })),
    ];

    // Determine plan category name (e.g., 火葬式, 家族葬)
    const categoryName = plan.category === 'cremation' ? '火葬式' : 'お葬式';
    const deceasedNameText = customerInfo?.deceasedName ? `故 ${customerInfo.deceasedName}` : '故 〇〇 〇〇';
    
    // Automatically format remarks to fulfill requirements
    const userRemarks = customerInfo?.remarks || '';
    const defaultRemarks = `上記、ご葬儀代金として（${plan.name}費用）`;
    const finalRemarks = userRemarks ? `${defaultRemarks}\n${userRemarks}` : defaultRemarks;

    return (
        <div id="receipt-document" className="w-[210mm] h-[297mm] bg-white text-gray-900 overflow-hidden relative leading-relaxed flex flex-col"
            style={{ padding: '15mm 20mm', boxSizing: 'border-box', fontFamily: '"Yu Mincho", "YuMincho", serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>

            {/* Header Area matching the receipt image */}
            <div className="flex justify-between items-end border-b-4 border-blue-800 pb-2 mb-8 !print-color-adjust-exact">
                <div className="flex items-center gap-6">
                    <span className="text-3xl font-bold bg-blue-800 text-white px-8 py-2 tracking-widest !print-color-adjust-exact">領 収 書</span>
                    <span className="text-xl font-bold">{deceasedNameText} 様</span>
                    <span className="text-xl font-bold">{categoryName}</span>
                </div>
                <div className="text-sm">発行日: {formattedIssueDate}</div>
            </div>

            <div className="flex justify-between mb-6">
                <div className="flex-1 pr-4">
                    <div className="mb-2">
                        <div className="text-xl font-bold border-b border-black inline-block pr-12 pb-1 relative min-w-[200px]">
                            {customerInfo?.applicantName || '　　　　'} 
                            <span className="absolute right-0 bottom-1">様</span>
                        </div>
                    </div>
                    <div className="text-sm leading-relaxed mb-4 min-h-[40px]">
                        <div>〒{(customerInfo?.applicantAddress || customerInfo?.chiefMournerAddress)?.split(' ')[0]?.replace('〒', '') || '　　-　　'}</div>
                        <div className="mt-1 break-words">{(customerInfo?.applicantAddress || customerInfo?.chiefMournerAddress)?.split(' ').slice(1).join(' ') || ''}</div>
                    </div>
                    
                    <div className="mb-4">
                        <span className="text-sm border-b border-black inline-block pr-8">葬祭日：{formattedFuneralDate}</span>
                    </div>
                    
                    <div className="text-sm mb-2">下記の金額、正に領収いたしました。</div>
                    
                    <div className="inline-flex items-center bg-blue-100 !print-color-adjust-exact">
                        <span className="bg-blue-800 text-white font-bold px-4 py-2 !print-color-adjust-exact">合計金額</span>
                        <span className="font-bold text-3xl font-mono px-6">¥{finalTotal.toLocaleString()}-</span>
                    </div>
                </div>
                
                <div className="w-[280px] text-right relative pl-4">
                    <div className="font-bold text-lg mb-1">{info.name}</div>
                    <div className="text-xs leading-relaxed text-gray-600">
                        <div>{info.address}</div><div>{info.contact}</div><div className="mt-1">{info.rep}</div>
                        {(info as any).registrationNumber && <div className="mt-1 text-[10px] text-gray-500">事業者登録番号: {(info as any).registrationNumber}</div>}
                    </div>
                    {info.stamp && <img src={info.stamp} alt="Stamp" className="absolute object-contain opacity-80" style={{ width: '70px', height: '70px', right: '0px', top: '10px' }} />}
                </div>
            </div>

            <div className="text-xs text-gray-500 mb-1">＜ 領収明細 ＞</div>
            
            <div className="border border-blue-800 text-sm mb-6 flex-1 flex flex-col">
                <div className="flex bg-blue-800 text-white font-bold !print-color-adjust-exact">
                    <div className="w-10 text-center py-2 px-1 border-r border-white">No.</div>
                    <div className="flex-1 text-left py-2 px-2 border-r border-white">商品名 / 品名</div>
                    <div className="w-20 text-center py-2 px-1 border-r border-white">数 量</div>
                    <div className="w-28 text-center py-2 px-2 border-r border-white">単 価</div>
                    <div className="w-32 text-center py-2 px-2">金 額</div>
                </div>
                <div className="flex-1 min-h-[300px]">
                    {allRows.map((row, i) => (
                        <div key={i} className={`flex border-b border-blue-200 ${i % 2 === 1 ? 'bg-blue-50' : ''} !print-color-adjust-exact`}>
                            <div className="w-10 text-center py-2 px-1 border-r border-blue-200">{i + 1}</div>
                            <div className="flex-1 text-left py-2 px-2 border-r border-blue-200 truncate">
                                {row.name} {row.detail ? `(${row.detail})` : ''} {row.nonTaxable ? '(非課税)' : ''}
                            </div>
                            <div className="w-20 text-center py-2 px-1 border-r border-blue-200 font-mono">1 回</div>
                            <div className="w-28 text-right py-2 px-2 border-r border-blue-200 font-mono text-gray-600">
                                {row.isIncluded ? '-' : row.price.toLocaleString()}
                            </div>
                            <div className="w-32 text-right py-2 px-2 font-mono">
                                {row.isIncluded ? 'プラン内' : row.price.toLocaleString()}
                            </div>
                        </div>
                    ))}
                    {/* Fill empty rows if needed (optional visual padding) */}
                    {Array.from({ length: Math.max(0, 15 - allRows.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className={`flex border-b border-blue-200 h-9 ${(i + allRows.length) % 2 === 1 ? 'bg-blue-50' : ''} !print-color-adjust-exact`}>
                            <div className="w-10 border-r border-blue-200"></div>
                            <div className="flex-1 border-r border-blue-200"></div>
                            <div className="w-20 border-r border-blue-200"></div>
                            <div className="w-28 border-r border-blue-200"></div>
                            <div className="w-32"></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end mb-6 text-sm">
                <div className="w-64">
                    <div className="flex justify-between py-1 border-b border-gray-300">
                        <span className="font-bold">小計 (税抜)</span><span className="font-mono">¥{taxableSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-300">
                        <span className="font-bold">消費税 (10%)</span><span className="font-mono">¥{taxAmount.toLocaleString()}</span>
                    </div>
                    {nonTaxableTotal > 0 && <div className="flex justify-between py-1 border-b border-gray-300">
                        <span className="font-bold">非課税計</span><span className="font-mono">¥{nonTaxableTotal.toLocaleString()}</span>
                    </div>}
                    <div className="flex justify-between py-2 border-b-2 border-blue-800 font-bold border-t border-t-gray-300">
                        <span>合 計 (税込)</span><span className="font-mono">¥{finalTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="mt-auto border-t-2 border-blue-800 pt-4">
                <div className="flex">
                    <div className="font-bold text-sm w-16">備考欄: </div>
                    <div className="flex-1 text-sm whitespace-pre-wrap">{finalRemarks}</div>
                </div>
            </div>
            
            <div className="border-b-4 border-blue-800 mt-8 mb-2"></div>
            <div className="border-b border-blue-800 mb-8"></div>
        </div>
    );
};

export default ReceiptDocument;
