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

const TOTAL_ROWS = 15;
const NAVY = '#1B3A5C';

const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
    plan, items, selectedOptions, selectedGrades, freeInputValues,
    customerInfo, logoType
}) => {
    const info = COMPANY_INFO[logoType];
    const today = new Date();

    const issueDateStr = today.toISOString().split('T')[0];
    const funeralDateStr = customerInfo?.funeralDate || '';

    const formatJapaneseEraDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('ja-JP-u-ca-japanese', {
            era: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formattedIssueDate = formatJapaneseEraDate(issueDateStr);
    const formattedFuneralDate = formatJapaneseEraDate(funeralDateStr);

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

    // Build display rows
    const dataRows: { name: string; quantity: string; unitPrice: number; amount: number }[] = [];
    dataRows.push({
        name: `基本プラン (${plan.name})`,
        quantity: '1 回',
        unitPrice: plan.price,
        amount: plan.price,
    });

    [...taxableOptions, ...nonTaxableOptions].forEach(item => {
        const price = getPrice(item);
        const gradeLabel = getGradeLabel(item);
        let name = item.name;
        if (gradeLabel) name += ` (${gradeLabel})`;
        if (item.nonTaxable) name += ' (非課税)';
        dataRows.push({ name, quantity: '1 回', unitPrice: price, amount: price });
    });

    const emptyRowCount = Math.max(0, TOTAL_ROWS - dataRows.length);
    const categoryName = plan.category === 'cremation' ? '火葬式' : 'お葬式';
    const deceasedName = customerInfo?.deceasedName || '';
    const applicantName = customerInfo?.applicantName || '　　　　';
    const applicantAddress = customerInfo?.applicantAddress || customerInfo?.chiefMournerAddress || '';
    const postalCode = applicantAddress?.split(' ')[0]?.replace('〒', '') || '';
    const addressBody = applicantAddress?.split(' ').slice(1).join(' ') || '';

    const contactParts = info.contact.split(' / ');
    const tel = contactParts[0] || '';
    const fax = contactParts[1] || '';

    const cellBorder = '1px solid #9CA3AF';

    return (
        <div id="receipt-document" className="w-[210mm] h-[297mm] bg-white text-gray-900 overflow-hidden relative flex flex-col"
            style={{ padding: '12mm 16mm', boxSizing: 'border-box', fontFamily: '"Yu Mincho", "YuMincho", serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', fontSize: '12px', lineHeight: '1.5' }}>

            {/* Header: Title + Deceased + Issue Date + Funeral Date */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ backgroundColor: NAVY, color: 'white', padding: '6px 20px', fontWeight: 'bold', fontSize: '20px', letterSpacing: '0.3em', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                        領 収 書
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                        {deceasedName ? `故 ${deceasedName} 様　${categoryName}` : categoryName}
                    </div>
                </div>
                <div style={{ fontSize: '12px', textAlign: 'right' }}>
                    <div style={{ marginBottom: '4px' }}>発行日：　{formattedIssueDate}</div>
                    <div>葬祭日：　{formattedFuneralDate || '　　 年 　 月 　 日'}</div>
                </div>
            </div>

            {/* Customer (left) + Company (right) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid black', paddingRight: '70px', paddingBottom: '3px' }}>
                            {applicantName}
                        </span>
                        <span style={{ fontSize: '14px', marginLeft: '10px', marginBottom: '3px' }}>様</span>
                    </div>
                    {postalCode && (
                        <div style={{ fontSize: '12px', marginTop: '5px' }}>〒{postalCode} {addressBody}</div>
                    )}
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>領収日：{formattedIssueDate}</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>下記の金額、正に領収いたしました。</div>
                </div>
                <div style={{ textAlign: 'right', position: 'relative', minWidth: '240px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>{info.name}</div>
                    <div style={{ fontSize: '11px', lineHeight: '1.7', color: '#374151' }}>
                        <div>{info.address}</div>
                        <div>{tel}</div>
                        <div>{fax}</div>
                    </div>
                    {info.stamp && (
                        <img src={info.stamp} alt="Stamp"
                            style={{ position: 'absolute', width: '70px', height: '70px', right: '-5px', top: '10px', objectFit: 'contain', opacity: 0.85 }} />
                    )}
                </div>
            </div>

            {/* Total Amount Box */}
            <div style={{ display: 'flex', alignItems: 'center', border: `2px solid ${NAVY}`, marginBottom: '12px', padding: '8px 16px' }}>
                <span style={{ backgroundColor: NAVY, color: 'white', fontWeight: 'bold', fontSize: '13px', padding: '4px 14px', marginRight: '20px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                    合計金額
                </span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                    ¥{finalTotal.toLocaleString()}-
                </span>
            </div>

            {/* Detail Section Header */}
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: NAVY, marginBottom: '5px' }}>＜ 領収明細 ＞</div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                    <tr style={{ backgroundColor: NAVY, color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '5px 4px', textAlign: 'center', width: '32px' }}>No.</th>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '5px 8px', textAlign: 'left' }}>商品名 / 品名</th>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '5px 4px', textAlign: 'center', width: '60px' }}>数 量</th>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '5px 4px', textAlign: 'center', width: '80px' }}>単 価</th>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '5px 4px', textAlign: 'center', width: '80px' }}>金 額</th>
                    </tr>
                </thead>
                <tbody>
                    {dataRows.map((row, i) => (
                        <tr key={i}>
                            <td style={{ border: cellBorder, padding: '3px 4px', textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ border: cellBorder, padding: '3px 8px' }}>{row.name}</td>
                            <td style={{ border: cellBorder, padding: '3px 4px', textAlign: 'center' }}>{row.quantity}</td>
                            <td style={{ border: cellBorder, padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{row.unitPrice.toLocaleString()}</td>
                            <td style={{ border: cellBorder, padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{row.amount.toLocaleString()}</td>
                        </tr>
                    ))}
                    {Array.from({ length: emptyRowCount }).map((_, i) => (
                        <tr key={`e-${i}`}>
                            <td style={{ border: cellBorder, padding: '3px 4px', textAlign: 'center' }}>{dataRows.length + i + 1}</td>
                            <td style={{ border: cellBorder, padding: '3px 8px' }}>&nbsp;</td>
                            <td style={{ border: cellBorder, padding: '3px 4px' }}></td>
                            <td style={{ border: cellBorder, padding: '3px 6px' }}></td>
                            <td style={{ border: cellBorder, padding: '3px 6px' }}></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals - right-aligned below table */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: cellBorder, padding: '5px 14px', fontWeight: 'bold', textAlign: 'center', color: NAVY, width: '120px' }}>小　計 (税抜)</td>
                            <td style={{ border: cellBorder, padding: '5px 14px', textAlign: 'right', fontFamily: 'monospace', width: '100px' }}>¥{taxableSubtotal.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style={{ border: cellBorder, padding: '5px 14px', fontWeight: 'bold', textAlign: 'center', color: NAVY }}>消費税 (10%)</td>
                            <td style={{ border: cellBorder, padding: '5px 14px', textAlign: 'right', fontFamily: 'monospace' }}>¥{taxAmount.toLocaleString()}</td>
                        </tr>
                        {nonTaxableTotal > 0 && (
                            <tr>
                                <td style={{ border: cellBorder, padding: '5px 14px', fontWeight: 'bold', textAlign: 'center', color: NAVY }}>非課税計</td>
                                <td style={{ border: cellBorder, padding: '5px 14px', textAlign: 'right', fontFamily: 'monospace' }}>¥{nonTaxableTotal.toLocaleString()}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ border: cellBorder, padding: '5px 14px', fontWeight: 'bold', textAlign: 'center', color: NAVY }}>合　計 (税込)</td>
                            <td style={{ border: cellBorder, padding: '5px 14px', textAlign: 'right', fontFamily: 'monospace' }}>¥{finalTotal.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ flex: 1, minHeight: '6px' }}></div>

            {/* Remarks */}
            <div style={{ border: '1px solid #9CA3AF', padding: '8px 12px', minHeight: '36px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: NAVY }}>備考欄：</span>
                <span style={{ fontSize: '11px', marginLeft: '10px' }}>{customerInfo?.remarks || ''}</span>
            </div>
        </div>
    );
};

export default ReceiptDocument;
