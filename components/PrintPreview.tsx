import React, { useEffect, useState } from 'react';
import QuoteDocument from './QuoteDocument';
import InvoiceDocument from './InvoiceDocument';
import ReceiptDocument from './ReceiptDocument';
import { deserializePrintData } from '../lib/serialization';
import { Plan, Item } from '../types';

const PrintPreview: React.FC = () => {
    const [data, setData] = useState<{
        plan: Plan;
        items: Item[];
        selectedOptions: Set<number>;
        selectedGrades: Map<number, string>;
        freeInputValues: Map<number, number>;
        totalCost: number;
        customerInfo?: any;
        estimateId?: number;
        logoType?: 'FL' | 'LS';
        documentType?: 'quote' | 'invoice' | 'receipt';
    } | null>(null);

    const isMobile = new URLSearchParams(window.location.search).get('mobile') === 'true';

    useEffect(() => {
        const stored = localStorage.getItem('print_data');
        if (stored) {
            const parsed = deserializePrintData(stored);
            if (parsed) setData(parsed);
        }
    }, []);

    if (!data) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-gray-500">読み込み中、またはデータが見つかりません...</div>
        </div>
    );

    const docProps = {
        plan: data.plan, items: data.items,
        selectedOptions: data.selectedOptions, selectedGrades: data.selectedGrades,
        freeInputValues: data.freeInputValues, totalCost: data.totalCost,
        customerInfo: data.customerInfo, estimateId: data.estimateId,
        logoType: data.logoType || 'FL' as const,
    };

    return (
        <div className="min-h-screen bg-gray-500 flex flex-col items-center py-8 print:bg-white print:py-0 print:block">
            {isMobile && (
                <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center space-y-6">
                        <span className="text-4xl">📄</span>
                        <h2 className="text-xl font-bold text-gray-800">{data.documentType === 'receipt' ? '領収書' : data.documentType === 'invoice' ? '請求書' : '見積書'}出力</h2>
                        <button onClick={() => window.print()} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700">
                            🖨️ 印刷する
                        </button>
                        <button onClick={() => window.close()} className="text-gray-400 text-sm underline hover:text-gray-600">閉じる</button>
                    </div>
                </div>
            )}
            {!isMobile && (
                <>
                    <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur shadow-md p-4 flex justify-between items-center print:hidden z-50">
                        <h1 className="font-bold text-gray-700">印刷プレビュー ({data.documentType === 'receipt' ? '領収書' : data.documentType === 'invoice' ? '請求書' : '見積書'})</h1>
                        <div className="flex gap-4">
                            <button onClick={() => window.close()} className="px-6 py-3 rounded border border-gray-300 hover:bg-gray-100 text-lg">閉じる</button>
                            <button onClick={() => window.print()} className="px-8 py-3 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-lg">印刷する</button>
                        </div>
                    </div>
                    <div className="h-16 print:hidden"></div>
                </>
            )}
            <div className={`w-full ${!isMobile ? 'overflow-x-auto pb-8 px-4 md:px-0 scrollbar-hide flex justify-center' : 'fixed top-0 left-0 -z-10'}`}>
                <div id="print-content" className="bg-white shadow-2xl print:shadow-none mx-auto print:mx-0 print:w-full min-w-[210mm]">
                    {data.documentType === 'receipt' ? <ReceiptDocument {...docProps} /> :
                     data.documentType === 'invoice' ? <InvoiceDocument {...docProps} /> : <QuoteDocument {...docProps} />}
                </div>
            </div>
            <style>{`
                @page { size: A4 portrait; margin: 0; }
                @media print { body { background: white; margin: 0; padding: 0; } }
            `}</style>
        </div>
    );
};

export default PrintPreview;
