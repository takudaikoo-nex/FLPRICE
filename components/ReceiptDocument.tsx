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

    // Determine plan category name (e.g., 火葬式, 家族葬)
    const categoryName = plan.category === 'cremation' ? '火葬式' : 'お葬式';
    const deceasedNameText = customerInfo?.deceasedName ? `故 ${customerInfo.deceasedName}` : '';
    
    // Automatically format remarks to fulfill requirements
    const userRemarks = customerInfo?.remarks || '';
    const defaultRemarks = `上記、ご葬儀代金として（${plan.name}費用）`;
    const finalRemarks = userRemarks ? `${defaultRemarks}\n${userRemarks}` : defaultRemarks;

    return (
        <div id="receipt-document" className="w-[210mm] h-[297mm] bg-white text-gray-900 overflow-hidden relative leading-relaxed flex flex-col"
            style={{ padding: '15mm 20mm', boxSizing: 'border-box', fontFamily: '"Yu Mincho", "YuMincho", serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>

            <div className="flex justify-between items-start mb-16 mt-8">
                <div></div> {/* Left Spacer */}
                
                {/* Title */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-[0.5em] border-b-2 border-black pb-2 px-12 mb-2">領収証</h1>
                </div>
                
                {/* Issue Date */}
                <div className="text-right text-lg">
                    {formattedIssueDate}
                </div>
            </div>

            <div className="flex justify-between items-start mb-16">
                {/* Left side: Addressee */}
                <div className="flex-1 mt-6">
                    <div className="text-3xl font-bold border-b border-black inline-block pr-16 pb-2 relative min-w-[300px]">
                        {customerInfo?.applicantName || '　　　　'} 
                        <span className="absolute right-2 bottom-2 text-xl tracking-widest">様</span>
                    </div>
                </div>

                {/* Right side: Issuer info */}
                <div className="w-[300px] text-right relative pt-2">
                    <div className="font-bold text-xl mb-2">{info.name}</div>
                    <div className="text-sm leading-relaxed text-gray-700">
                        <div>{info.address}</div>
                        <div>{info.contact}</div>
                        <div className="mt-1">{info.rep}</div>
                        {(info as any).registrationNumber && <div className="mt-1 text-xs text-gray-500">登録番号: {(info as any).registrationNumber}</div>}
                    </div>
                    {info.stamp && <img src={info.stamp} alt="Stamp" className="absolute object-contain opacity-90" style={{ width: '85px', height: '85px', right: '-10px', top: '20px' }} />}
                </div>
            </div>

            {/* Total Amount Area */}
            <div className="mb-10 w-full">
                <div className="bg-blue-50 border border-blue-200 py-8 px-10 text-center relative shadow-sm !print-color-adjust-exact">
                    <div className="absolute top-3 left-4 text-sm text-blue-900 tracking-widest font-bold">金額</div>
                    <div className="flex items-end justify-center gap-4">
                        <span className="text-4xl font-bold leading-none font-serif text-blue-900 pr-2">¥</span>
                        <span className="text-5xl font-bold tracking-widest font-mono text-blue-900 leading-none">{finalTotal.toLocaleString()}</span>
                        <span className="text-3xl font-bold leading-none text-blue-900 pl-2">-</span>
                    </div>
                </div>
            </div>

            {/* Tax Breakdown */}
            <div className="mb-16">
                <table className="w-[350px] ml-auto border-collapse text-sm">
                    <tbody>
                        <tr className="border-b border-gray-300">
                            <td className="w-1/2 py-2 text-gray-600">税抜金額</td>
                            <td className="w-1/2 py-2 text-right font-mono">¥{taxableSubtotal.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                            <td className="w-1/2 py-2 text-gray-600">消費税等額 (10%)</td>
                            <td className="w-1/2 py-2 text-right font-mono">¥{taxAmount.toLocaleString()}</td>
                        </tr>
                        {nonTaxableTotal > 0 && (
                            <tr className="border-b border-gray-300">
                                <td className="w-1/2 py-2 text-gray-600">非課税金額</td>
                                <td className="w-1/2 py-2 text-right font-mono">¥{nonTaxableTotal.toLocaleString()}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Remarks Area */}
            <div className="border border-black p-4 min-h-[160px] flex flex-col relative w-full">
                <div className="absolute top-[-10px] left-4 bg-white px-2 font-bold text-sm tracking-widest">
                    但し書き
                </div>
                <div className="mt-4 text-base leading-relaxed pl-2 whitespace-pre-wrap">
                    {finalRemarks}
                </div>
                {deceasedNameText && (
                    <div className="mt-4 pl-2 text-sm text-gray-700">
                        ({deceasedNameText} 様 {categoryName}： 葬祭日 {formattedFuneralDate})
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-[20px]"></div>

            {/* Footer space */}
            <div className="text-center text-sm text-gray-400 mt-12 pb-8">
                この領収証は再発行いたしませんので大切に保管してください。
            </div>

        </div>
    );
};

export default ReceiptDocument;
