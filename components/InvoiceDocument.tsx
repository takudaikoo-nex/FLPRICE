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

const TOTAL_ROWS = 24;
const NAVY = '#1B3A5C';

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
    plan, items, selectedOptions, selectedGrades, freeInputValues,
    customerInfo, logoType
}) => {
    const info = COMPANY_INFO[logoType];
    const today = new Date();

    const formatJapaneseDate = (date: Date) => {
        return date.toLocaleDateString('ja-JP-u-ca-japanese', {
            era: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formattedDate = formatJapaneseDate(today);
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 7);
    const formattedDeadline = formatJapaneseDate(deadline);

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
    const preTaxTotal = taxableSubtotal + nonTaxableTotal;

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
        <div id="invoice-document" className="w-[210mm] h-[297mm] bg-white text-gray-900 overflow-hidden relative flex flex-col"
            style={{ padding: '10mm 14mm', boxSizing: 'border-box', fontFamily: '"Yu Mincho", "YuMincho", serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', fontSize: '10.5px', lineHeight: '1.4' }}>

            {/* Header: Title + Deceased + Issue Date */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: NAVY, color: 'white', padding: '5px 16px', fontWeight: 'bold', fontSize: '16px', letterSpacing: '0.3em' }}>
                        請 求 書
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                        {deceasedName ? `故 ${deceasedName} 様　${categoryName}` : categoryName}
                    </div>
                </div>
                <div style={{ fontSize: '10px' }}>発行日：　{formattedDate}</div>
            </div>

            {/* Customer (left) + Company (right) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid black', paddingRight: '60px', paddingBottom: '2px' }}>
                            {applicantName}
                        </span>
                        <span style={{ fontSize: '12px', marginLeft: '8px', marginBottom: '2px' }}>様</span>
                    </div>
                    {postalCode && (
                        <div style={{ fontSize: '10px', marginTop: '4px' }}>〒{postalCode} {addressBody}</div>
                    )}
                    <div style={{ fontSize: '10px', marginTop: '6px' }}>請求日：{formattedDate}</div>
                    <div style={{ fontSize: '10px', marginTop: '3px' }}>下記のとおりご請求申し上げます。</div>
                </div>
                <div style={{ textAlign: 'right', position: 'relative', minWidth: '210px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>{info.name}</div>
                    <div style={{ fontSize: '9.5px', lineHeight: '1.6', color: '#374151' }}>
                        <div>{info.address}</div>
                        <div>{tel}</div>
                        <div>{fax}</div>
                    </div>
                    {info.stamp && (
                        <img src={info.stamp} alt="Stamp"
                            style={{ position: 'absolute', width: '55px', height: '55px', right: '0', top: '8px', objectFit: 'contain', opacity: 0.85 }} />
                    )}
                </div>
            </div>

            {/* Total Amount Box */}
            <div style={{ display: 'flex', alignItems: 'center', border: `2px solid ${NAVY}`, marginBottom: '8px', padding: '6px 12px' }}>
                <span style={{ backgroundColor: NAVY, color: 'white', fontWeight: 'bold', fontSize: '11px', padding: '3px 10px', marginRight: '16px' }}>
                    合計金額
                </span>
                <span style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                    ¥{finalTotal.toLocaleString()}-
                </span>
            </div>

            {/* Detail Section Header */}
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: NAVY, marginBottom: '4px' }}>＜ 請求明細 ＞</div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                <thead>
                    <tr style={{ backgroundColor: NAVY, color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '4px 2px', textAlign: 'center', width: '28px' }}>No.</th>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '4px 6px', textAlign: 'left' }}>商品名 / 品名</th>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '4px 2px', textAlign: 'center', width: '52px' }}>数 量</th>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '4px 2px', textAlign: 'center', width: '70px' }}>単 価</th>
                        <th style={{ border: `1px solid ${NAVY}`, padding: '4px 2px', textAlign: 'center', width: '70px' }}>金 額</th>
                    </tr>
                </thead>
                <tbody>
                    {dataRows.map((row, i) => (
                        <tr key={i}>
                            <td style={{ border: cellBorder, padding: '2px 4px', textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ border: cellBorder, padding: '2px 6px' }}>{row.name}</td>
                            <td style={{ border: cellBorder, padding: '2px 4px', textAlign: 'center' }}>{row.quantity}</td>
                            <td style={{ border: cellBorder, padding: '2px 4px', textAlign: 'right', fontFamily: 'monospace' }}>{row.unitPrice.toLocaleString()}</td>
                            <td style={{ border: cellBorder, padding: '2px 4px', textAlign: 'right', fontFamily: 'monospace' }}>{row.amount.toLocaleString()}</td>
                        </tr>
                    ))}
                    {Array.from({ length: emptyRowCount }).map((_, i) => (
                        <tr key={`e-${i}`}>
                            <td style={{ border: cellBorder, padding: '2px 4px', textAlign: 'center' }}>{dataRows.length + i + 1}</td>
                            <td style={{ border: cellBorder, padding: '2px 6px' }}>&nbsp;</td>
                            <td style={{ border: cellBorder, padding: '2px 4px' }}></td>
                            <td style={{ border: cellBorder, padding: '2px 4px' }}></td>
                            <td style={{ border: cellBorder, padding: '2px 4px' }}></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals - right-aligned below table */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: cellBorder, padding: '4px 10px', fontWeight: 'bold', textAlign: 'center', color: NAVY, width: '110px' }}>小　計 (税抜)</td>
                            <td style={{ border: cellBorder, padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace', width: '90px' }}>¥{preTaxTotal.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style={{ border: cellBorder, padding: '4px 10px', fontWeight: 'bold', textAlign: 'center', color: NAVY }}>消費税 (10%)</td>
                            <td style={{ border: cellBorder, padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace' }}>¥{taxAmount.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style={{ border: cellBorder, padding: '4px 10px', fontWeight: 'bold', textAlign: 'center', color: NAVY }}>合　計 (税込)</td>
                            <td style={{ border: cellBorder, padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace' }}>¥{finalTotal.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ flex: 1, minHeight: '4px' }}></div>

            {/* Bank Info */}
            <div style={{ marginBottom: '6px', fontSize: '9.5px' }}>
                <div style={{ fontWeight: 'bold', color: NAVY, marginBottom: '3px' }}>お振込先</div>
                <div style={{ marginLeft: '8px', lineHeight: '1.5' }}>
                    {info.bankInfo.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                </div>
                <div style={{ marginLeft: '8px', marginTop: '3px', fontSize: '9px', color: '#6B7280' }}>
                    <div>※お振込手数料はお客様負担にてお願いいたします。</div>
                    <div>※お支払期限: <span style={{ fontWeight: 'bold', color: 'black' }}>{formattedDeadline}</span></div>
                </div>
            </div>

            {/* Remarks */}
            <div style={{ border: '1px solid #9CA3AF', padding: '6px 8px', minHeight: '30px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '10px', color: NAVY }}>備考欄：</span>
                <span style={{ fontSize: '9.5px', marginLeft: '8px' }}>{customerInfo?.remarks || ''}</span>
            </div>
        </div>
    );
};

export default InvoiceDocument;
