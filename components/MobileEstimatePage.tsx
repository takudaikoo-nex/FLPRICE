import React, { useState, useMemo } from 'react';
import DetailModal from './DetailModal';
import MobileFooter from './MobileFooter';
import { Info, Check, ChevronDown, ChevronUp, CheckCircle2, FolderOpen, PlusCircle } from 'lucide-react';
import { useEstimateSystem } from '../hooks/useEstimateSystem';
import { MoneyInput } from './MoneyInput';
import { MultiGradeButton } from './MultiGradeButton';
import { MultiGradeModal } from './MultiGradeModal';
import { getMultiGradeSubtotal } from '../lib/pricing';
import { resolveOption, toProductMap } from '../lib/catalogProducts';

interface MobileEstimatePageProps {
    system: ReturnType<typeof useEstimateSystem>;
    onOutputClick: () => Promise<void>;
    onInvoiceClick: () => Promise<void>;
    onReceiptClick: () => Promise<void>;
    goToInputPage: () => void;
    onLoadClick: () => Promise<void>;
}


const MobileEstimatePage: React.FC<MobileEstimatePageProps> = ({ system, onOutputClick, onInvoiceClick, onReceiptClick, goToInputPage, onLoadClick }) => {
    const {
        category, selectedPlanId,
        selectedOptions, selectedGrades, freeInputValues, multiGradeValues,
        modalItem, setModalItem, multiGradeModalItem, setMultiGradeModalItem,
        plans, items, catalogProducts,
        handleCategoryChange, handlePlanChange, toggleOption, setGrade, setFreeInputValue,
        setGradeQuantity, setItemDiscount,
        totalCost,
    } = system;

    const [isIncludedOpen, setIsIncludedOpen] = useState(false);
    // 選択肢の表示名は、商品マスタに紐付いていればマスタ側を正とする
    const productMap = useMemo(() => toProductMap(catalogProducts), [catalogProducts]);

    const includedItems = items.filter(i => i.allowedPlans.includes(selectedPlanId) && i.includedInPlans.includes(selectedPlanId));
    const optionItems = items.filter(i => i.allowedPlans.includes(selectedPlanId) && !i.includedInPlans.includes(selectedPlanId));

    return (
        <div className={`fl-shell fl-est fl-est-mobile is-${category}`}>
            <header className="fl-header fl-est-mobile-header">
                <div className="fl-header-left">
                    <h1>お見積り作成</h1>
                </div>
                <div className="fl-header-actions">
                    <button type="button" className="fl-header-btn" onClick={onLoadClick}>
                        <FolderOpen size={15} />
                        呼出
                    </button>
                </div>
            </header>

            <main className="fl-est-page">
                <div className="fl-est-side">
                    <div className="fl-tabs">
                        <button
                            type="button"
                            className={`fl-tab ${category === 'cremation' ? 'is-active' : ''}`}
                            onClick={() => handleCategoryChange('cremation')}
                        >
                            火葬式プラン
                        </button>
                        <button
                            type="button"
                            className={`fl-tab ${category === 'funeral' ? 'is-active' : ''}`}
                            onClick={() => handleCategoryChange('funeral')}
                        >
                            葬儀プラン
                        </button>
                    </div>

                    <div className="fl-plan-group">
                        <h2 className="fl-plan-group-title">
                            <Check size={16} />
                            プラン選択
                        </h2>
                        <div className="fl-plan-list">
                            {plans.filter(p => p.category === category).map(plan => (
                                <label
                                    key={plan.id}
                                    className={`fl-plan-card ${selectedPlanId === plan.id ? 'is-selected' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="plan"
                                        value={plan.id}
                                        checked={selectedPlanId === plan.id}
                                        onChange={() => handlePlanChange(plan.id)}
                                    />
                                    {/* 金額は選択中のプランだけ。接客中に他プランの額を見せない */}
                                    <div className="fl-plan-card-head">
                                        <span className="fl-plan-name">{plan.name}</span>
                                        {selectedPlanId === plan.id && (
                                            <span className="fl-plan-price">¥{plan.price.toLocaleString()}</span>
                                        )}
                                    </div>
                                    <p className="fl-plan-desc">{plan.description}</p>
                                    {selectedPlanId === plan.id && <span className="fl-plan-dot" />}
                                </label>
                            ))}
                        </div>
                        <p className="fl-plan-note">※ 表示価格は税抜です</p>
                    </div>

                    <div className="fl-opt-panel">
                        <div className="fl-opt-panel-head">オプション選択</div>

                        <div className="fl-opt-panel-body">
                            {includedItems.length > 0 && (
                                <div className="fl-opt-group">
                                    <button
                                        type="button"
                                        className="fl-opt-group-head"
                                        onClick={() => setIsIncludedOpen(!isIncludedOpen)}
                                    >
                                        <span className="fl-opt-group-title">
                                            <CheckCircle2 size={18} />
                                            プランに含まれるもの（{includedItems.length}点）
                                        </span>
                                        <span className="fl-opt-group-toggle">
                                            {isIncludedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </span>
                                    </button>

                                    {isIncludedOpen && (
                                        <div className="fl-opt-list">
                                            {includedItems.map(item => (
                                                <div key={item.id} className="fl-opt-row">
                                                    <div className="fl-opt-row-main">
                                                        <div className="fl-opt-name">
                                                            <span className="fl-opt-name-text">{item.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="fl-opt-control">
                                                        {item.type === 'dropdown' && item.options ? (
                                                            <select
                                                                className="fl-select"
                                                                value={selectedGrades.get(item.id) || ''}
                                                                onChange={(e) => setGrade(item.id, e.target.value)}
                                                            >
                                                                <option value="">基本（プラン内）</option>
                                                                {item.options.filter(o => o.allowedPlans.includes(selectedPlanId)).map(opt => (
                                                                    <option key={opt.id} value={opt.id}>
                                                                        {resolveOption(opt, productMap).name}（+¥{(opt.planPrices?.[selectedPlanId] ?? opt.price).toLocaleString()}）
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <span className="fl-opt-included">プランに含む</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {optionItems.length > 0 && (
                                <div className="fl-opt-group">
                                    <div className="fl-opt-group-head is-static">
                                        <span className="fl-opt-group-title">
                                            <PlusCircle size={18} />
                                            追加オプション（{optionItems.length}点）
                                        </span>
                                    </div>

                                    <div className="fl-opt-list">
                                        {optionItems.map(item => {
                                            const isSelected = item.type === 'checkbox' ? selectedOptions.has(item.id)
                                                : item.type === 'dropdown' ? selectedGrades.has(item.id)
                                                : item.type === 'multi_grade' ? getMultiGradeSubtotal(item, selectedPlanId, multiGradeValues.get(item.id)) > 0
                                                : (freeInputValues.get(item.id) ?? 0) !== 0;

                                            return (
                                                <div key={item.id} className={`fl-opt-row ${isSelected ? 'is-selected' : ''}`}>
                                                    <div className="fl-opt-row-main">
                                                        <div className="fl-opt-name">
                                                            <span className="fl-opt-name-text">{item.name}</span>
                                                            {item.nonTaxable && <span className="fl-tag is-tax">非課税</span>}
                                                            <button
                                                                type="button"
                                                                className="fl-info-btn"
                                                                title="詳細を見る"
                                                                onClick={() => setModalItem(item)}
                                                            >
                                                                <Info size={16} />
                                                            </button>
                                                        </div>
                                                        {item.type === 'checkbox' && item.basePrice ? (
                                                            <div className="fl-opt-price">¥{item.basePrice.toLocaleString()}</div>
                                                        ) : null}
                                                    </div>

                                                    <div className="fl-opt-control">
                                                        {item.type === 'checkbox' && (
                                                            <label className="fl-check">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedOptions.has(item.id)}
                                                                    onChange={() => toggleOption(item.id)}
                                                                />
                                                                追加する
                                                            </label>
                                                        )}

                                                        {item.type === 'dropdown' && item.options && (
                                                            <select
                                                                className="fl-select"
                                                                value={selectedGrades.get(item.id) || ''}
                                                                onChange={(e) => setGrade(item.id, e.target.value)}
                                                            >
                                                                <option value="">選択なし</option>
                                                                {item.options.filter(o => o.allowedPlans.includes(selectedPlanId)).map(opt => (
                                                                    <option key={opt.id} value={opt.id}>
                                                                        {resolveOption(opt, productMap).name}（¥{(opt.planPrices?.[selectedPlanId] ?? opt.price).toLocaleString()}）
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}

                                                        {item.type === 'multi_grade' && item.options && (
                                                            <MultiGradeButton
                                                                item={item}
                                                                planId={selectedPlanId}
                                                                selection={multiGradeValues.get(item.id)}
                                                                products={productMap}
                                                                onClick={() => setMultiGradeModalItem(item)}
                                                            />
                                                        )}

                                                        {item.type === 'free_input' && (
                                                            <MoneyInput
                                                                value={freeInputValues.get(item.id) || 0}
                                                                onChange={(v) => setFreeInputValue(item.id, v)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <MobileFooter total={totalCost} onInputClick={goToInputPage} onOutputClick={onOutputClick} onInvoiceClick={onInvoiceClick} onReceiptClick={onReceiptClick} />
            {modalItem && (
                <DetailModal
                    item={modalItem}
                    selectedGrade={selectedGrades.get(modalItem.id)}
                    planId={selectedPlanId}
                    products={catalogProducts}
                    onClose={() => setModalItem(null)}
                />
            )}
            {multiGradeModalItem && (
                <MultiGradeModal
                    item={multiGradeModalItem}
                    planId={selectedPlanId}
                    selection={multiGradeValues.get(multiGradeModalItem.id)}
                    products={productMap}
                    onQuantityChange={(gradeId, qty) => setGradeQuantity(multiGradeModalItem.id, gradeId, qty)}
                    onDiscountChange={(type, value) => setItemDiscount(multiGradeModalItem.id, type, value)}
                    onClose={() => setMultiGradeModalItem(null)}
                />
            )}
        </div>
    );
};

export default MobileEstimatePage;
