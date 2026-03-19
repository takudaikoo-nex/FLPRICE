import React from 'react';
import DetailModal from './DetailModal';
import MobileFooter from './MobileFooter';
import { Info, Check } from 'lucide-react';
import { useEstimateSystem } from '../hooks/useEstimateSystem';

interface MobileEstimatePageProps {
    system: ReturnType<typeof useEstimateSystem>;
    onOutputClick: () => Promise<void>;
    onInvoiceClick: () => Promise<void>;
    goToInputPage: () => void;
    onLoadClick: () => Promise<void>;
}

const MobileEstimatePage: React.FC<MobileEstimatePageProps> = ({ system, onOutputClick, onInvoiceClick, goToInputPage, onLoadClick }) => {
    const {
        selectedPlanId,
        optionValues,
        modalItem, setModalItem,
        plans, items,
        handlePlanChange, setOptionValue,
        totalCost,
    } = system;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
            {/* Mobile Header */}
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-800">お見積り作成</h1>
                <button
                    onClick={onLoadClick}
                    className="text-xs bg-gray-100 border border-gray-300 rounded px-3 py-1.5 text-gray-500 hover:bg-gray-200"
                >
                    呼出
                </button>
            </div>

            <main className="flex-1 p-4 w-full max-w-lg mx-auto">

                {/* Plan Selection */}
                <section className="mb-6">
                    <h2 className="font-bold mb-3 flex items-center gap-2 text-emerald-700">
                        <Check size={18} /> プラン選択
                    </h2>
                    <div className="space-y-3">
                        {plans.map(plan => (
                            <label
                                key={plan.id}
                                className={`block relative cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedPlanId === plan.id
                                    ? 'bg-white border-emerald-500 text-emerald-700 shadow-md'
                                    : 'bg-white/60 border-transparent text-gray-600'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="plan"
                                    value={plan.id}
                                    checked={selectedPlanId === plan.id}
                                    onChange={() => handlePlanChange(plan.id)}
                                    className="sr-only"
                                />
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-lg">{plan.name}</span>
                                    <span className="font-bold text-xl">¥{plan.price.toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-gray-500 leading-snug">{plan.description}</p>
                                {selectedPlanId === plan.id && (
                                    <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-emerald-500"></div>
                                )}
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-right">※ 価格は全て税込表示です</p>
                </section>

                {/* Options List */}
                <section>
                    <h2 className="font-bold mb-3 text-lg text-emerald-700">追加費用・オプション</h2>
                    <p className="text-xs text-gray-500 mb-3">該当する項目に金額を入力してください（税込）</p>
                    <div className="space-y-3">
                        {items.map(item => {
                            const value = optionValues.get(item.id) ?? 0;
                            return (
                                <div key={item.id} className={`p-4 rounded-xl border transition-all ${value > 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-800">{item.name}</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                                        </div>
                                        <button onClick={() => setModalItem(item)} className="text-gray-400 p-1 ml-2">
                                            <Info size={20} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-end gap-1">
                                        <span className="text-sm text-gray-500">¥</span>
                                        <input
                                            type="number"
                                            value={value || ''}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setOptionValue(item.id, isNaN(val) ? 0 : val);
                                            }}
                                            placeholder="0"
                                            className="w-32 p-2 border border-gray-300 rounded text-right font-mono"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

            </main>

            {/* Footer */}
            <MobileFooter
                total={totalCost}
                onInputClick={goToInputPage}
                onOutputClick={onOutputClick}
                onInvoiceClick={onInvoiceClick}
            />

            {/* Modal */}
            {modalItem && (
                <DetailModal
                    item={modalItem}
                    onClose={() => setModalItem(null)}
                />
            )}
        </div>
    );
};

export default MobileEstimatePage;
