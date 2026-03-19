import React, { useState } from 'react';
import { PlanCategory } from '../types';
import DetailModal from './DetailModal';
import MobileFooter from './MobileFooter';
import { Info, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useEstimateSystem } from '../hooks/useEstimateSystem';

interface MobileEstimatePageProps {
    system: ReturnType<typeof useEstimateSystem>;
    onOutputClick: () => Promise<void>;
    onInvoiceClick: () => Promise<void>;
    goToInputPage: () => void;
    onLoadClick: () => Promise<void>;
}

const THEME = {
    cremation: { active: 'bg-purple-600 text-white shadow-md', text: 'text-purple-700', dot: 'bg-purple-500', selectedBorder: 'border-purple-500 text-purple-700' },
    funeral: { active: 'bg-emerald-600 text-white shadow-md', text: 'text-emerald-700', dot: 'bg-emerald-500', selectedBorder: 'border-emerald-500 text-emerald-700' },
} as const;

const MobileEstimatePage: React.FC<MobileEstimatePageProps> = ({ system, onOutputClick, onInvoiceClick, goToInputPage, onLoadClick }) => {
    const {
        category, selectedPlanId,
        selectedOptions, selectedGrades, freeInputValues,
        modalItem, setModalItem,
        plans, items,
        handleCategoryChange, handlePlanChange, toggleOption, setGrade, setFreeInputValue,
        totalCost,
    } = system;

    const [isIncludedOpen, setIsIncludedOpen] = useState(false);
    const theme = THEME[category];

    const includedItems = items.filter(i => i.allowedPlans.includes(selectedPlanId) && i.includedInPlans.includes(selectedPlanId));
    const optionItems = items.filter(i => i.allowedPlans.includes(selectedPlanId) && !i.includedInPlans.includes(selectedPlanId));

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-800">お見積り作成</h1>
                <button onClick={onLoadClick} className="text-xs bg-gray-100 border border-gray-300 rounded px-3 py-1.5 text-gray-500 hover:bg-gray-200">呼出</button>
            </div>

            <main className="flex-1 p-4 w-full max-w-lg mx-auto">
                {/* Category Tabs */}
                <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-200 p-1 rounded-xl">
                    <button onClick={() => handleCategoryChange('cremation')} className={`py-2 px-4 rounded-lg font-bold transition-all text-sm ${category === 'cremation' ? theme.active : 'bg-gray-100 text-gray-500'}`}>
                        火葬式プラン
                    </button>
                    <button onClick={() => handleCategoryChange('funeral')} className={`py-2 px-4 rounded-lg font-bold transition-all text-sm ${category === 'funeral' ? THEME.funeral.active : 'bg-gray-100 text-gray-500'}`}>
                        葬儀プラン
                    </button>
                </div>

                {/* Plans */}
                <section className="mb-6">
                    <h2 className={`font-bold mb-3 flex items-center gap-2 ${theme.text}`}><Check size={18} /> プラン選択</h2>
                    <div className="space-y-3">
                        {plans.filter(p => p.category === category).map(plan => (
                            <label key={plan.id} className={`block relative cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedPlanId === plan.id ? `bg-white shadow-md ${theme.selectedBorder}` : 'bg-white/60 border-transparent text-gray-600'}`}>
                                <input type="radio" name="plan" value={plan.id} checked={selectedPlanId === plan.id} onChange={() => handlePlanChange(plan.id)} className="sr-only" />
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-lg">{plan.name}</span>
                                    <span className="font-bold text-xl">¥{plan.price.toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-gray-500 leading-snug">{plan.description}</p>
                                {selectedPlanId === plan.id && <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${theme.dot}`}></div>}
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-right">※ 表示価格は税抜です</p>
                </section>

                {/* Included Items */}
                {includedItems.length > 0 && (
                    <section className="mb-6">
                        <button onClick={() => setIsIncludedOpen(!isIncludedOpen)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl font-bold transition-colors ${isIncludedOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-white border border-gray-200 text-gray-600'}`}>
                            <span>プランに含まれるもの ({includedItems.length})</span>
                            {isIncludedOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        {isIncludedOpen && (
                            <div className="mt-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {includedItems.map(item => (
                                    <div key={item.id} className="p-3 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                        <span className="text-sm font-medium">{item.name}</span>
                                        {item.type === 'dropdown' && item.options ? (
                                            <select className="text-xs p-1 border border-gray-300 rounded bg-white"
                                                value={selectedGrades.get(item.id) || ''} onChange={(e) => setGrade(item.id, e.target.value)}>
                                                <option value="">基本</option>
                                                {item.options.filter(o => o.allowedPlans.includes(selectedPlanId)).map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.name} (+¥{(opt.planPrices?.[selectedPlanId] ?? opt.price).toLocaleString()})</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">含む</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Options */}
                <section>
                    <h2 className={`font-bold mb-3 text-lg ${theme.text}`}>追加オプション</h2>
                    <div className="space-y-3">
                        {optionItems.map(item => {
                            const isSelected = item.type === 'checkbox' ? selectedOptions.has(item.id) : item.type === 'dropdown' ? selectedGrades.has(item.id) : (freeInputValues.get(item.id) ?? 0) > 0;
                            return (
                                <div key={item.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
                                            {item.nonTaxable && <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded">非課税</span>}
                                            {item.type === 'checkbox' && item.basePrice ? <div className="text-xs text-gray-500">¥{item.basePrice.toLocaleString()}</div> : null}
                                        </div>
                                        <button onClick={() => setModalItem(item)} className="text-gray-400 p-1 ml-2"><Info size={20} /></button>
                                    </div>
                                    <div className="mt-2">
                                        {item.type === 'checkbox' && (
                                            <label className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer">
                                                <input type="checkbox" checked={selectedOptions.has(item.id)} onChange={() => toggleOption(item.id)} className="w-6 h-6 rounded text-emerald-600" />
                                                <span className="text-sm font-bold">追加する</span>
                                            </label>
                                        )}
                                        {item.type === 'dropdown' && item.options && (
                                            <select className="w-full p-3 border border-gray-300 rounded-lg text-base bg-white"
                                                value={selectedGrades.get(item.id) || ''} onChange={(e) => setGrade(item.id, e.target.value)}>
                                                <option value="">選択なし</option>
                                                {item.options.filter(o => o.allowedPlans.includes(selectedPlanId)).map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.name} (¥{(opt.planPrices?.[selectedPlanId] ?? opt.price).toLocaleString()})</option>
                                                ))}
                                            </select>
                                        )}
                                        {item.type === 'free_input' && (
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-sm text-gray-500">¥</span>
                                                <input type="number" value={freeInputValues.get(item.id) || ''} placeholder="0"
                                                    onChange={(e) => { const v = parseInt(e.target.value); setFreeInputValue(item.id, isNaN(v) ? 0 : v); }}
                                                    className="w-32 p-2 border border-gray-300 rounded text-right font-mono" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>

            <MobileFooter total={totalCost} onInputClick={goToInputPage} onOutputClick={onOutputClick} onInvoiceClick={onInvoiceClick} />
            {modalItem && <DetailModal item={modalItem} onClose={() => setModalItem(null)} />}
        </div>
    );
};

export default MobileEstimatePage;
