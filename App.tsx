import React, { useEffect, useState } from 'react';
import { CustomerInfo } from './types';
import DetailModal from './components/DetailModal';
import Footer from './components/Footer';
import {
  Info, Check, ChevronDown, ChevronUp, CheckCircle2,
  Home, Images, FolderOpen, PlusCircle,
} from 'lucide-react';
import PrintPreview from './components/PrintPreview';
import CustomerInputPage from './components/CustomerInputPage';
import StartScreen from './components/StartScreen';
import { useEstimateSystem } from './hooks/useEstimateSystem';
import { useSupabaseSession } from './hooks/useSupabaseSession';
import MobileEstimatePage from './components/MobileEstimatePage';
import TopScreen from './components/TopScreen';
import CustomerListPage from './components/CustomerListPage';
import EstimateSearchPage from './components/EstimateSearchPage';
import FlowerFuneralsPage from './components/flower/FlowerFuneralsPage';
import FlowerOrdersPage from './components/flower/FlowerOrdersPage';
import CaseTaskPage from './components/tasks/CaseTaskPage';
import LoginGate from './components/LoginGate';
import OptionCatalogPage from './components/OptionCatalogPage';
import { MoneyInput } from './components/MoneyInput';
import { MultiGradeButton } from './components/MultiGradeButton';
import { MultiGradeModal } from './components/MultiGradeModal';
import { getMultiGradeSubtotal } from './lib/pricing';
import { resolveOption, toProductMap } from './lib/catalogProducts';
const EMPTY_CUSTOMER_INFO: CustomerInfo = {
  deathDate: '', deceasedName: '', birthDate: '', age: '', address: '', honseki: '',
  applicantName: '', applicantRelation: '', applicantBirthDate: '',
  chiefMournerName: '', chiefMournerAddress: '', chiefMournerPhone: '', chiefMournerMobile: '',
  religion: '', templeName: '', templePhone: '', templeFax: '', remarks: ''
};




const App: React.FC = () => {
  const system = useEstimateSystem();
  const {
    isPrintMode, category, selectedPlanId,
    selectedOptions, selectedGrades, freeInputValues, multiGradeValues,
    modalItem, setModalItem, multiGradeModalItem, setMultiGradeModalItem,
    loadedCustomerInfo, setLoadedCustomerInfo,
    viewMode, setViewMode, isSaving, logoType,
    plans, items, catalogProducts, loading,
    handleCategoryChange, handlePlanChange, toggleOption, setGrade, setFreeInputValue,
    setGradeQuantity, setItemDiscount,
    currentPlan, totalCost, toggleLogo, handleSaveAndPrint, executeLoadEstimate
  } = system;

  // 選択肢の表示名・画像は、商品マスタに紐付いていればマスタ側を正とする
  const productMap = React.useMemo(() => toProductMap(catalogProducts), [catalogProducts]);

  const [isMobile, setIsMobile] = useState(false);
  const isCatalogMode = new URLSearchParams(window.location.search).get('catalog') === 'true';
  const [isIncludedOpen, setIsIncludedOpen] = useState(true);
  // ログイン状態は管理画面と同じフックで扱う
  const { session, loading: authLoading } = useSupabaseSession();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'start') setViewMode('start');
    if (params.get('mobile') === 'true') { setIsMobile(true); setViewMode('start'); }
  }, []);

  const handleOutputClick = async () => {
    if (!currentPlan) { alert('プランが選択されていません。'); return; }
    await handleSaveAndPrint(loadedCustomerInfo || EMPTY_CUSTOMER_INFO);
  };
  const handleInvoiceClick = async () => {
    if (!currentPlan) { alert('プランが選択されていません。'); return; }
    await handleSaveAndPrint(loadedCustomerInfo || EMPTY_CUSTOMER_INFO, 'invoice');
  };
  const handleReceiptClick = async () => {
    if (!currentPlan) { alert('プランが選択されていません。'); return; }
    await handleSaveAndPrint(loadedCustomerInfo || EMPTY_CUSTOMER_INFO, 'receipt');
  };
  const handleLoadEstimate = async () => {
    const input = window.prompt('呼び出す見積番号を入力してください');
    if (!input) return;
    const id = parseInt(input);
    if (isNaN(id)) { alert('有効な数字を入力してください'); return; }
    await executeLoadEstimate(id);
  };
  const goToInputPage = () => {
    if (!currentPlan) { alert('プランが選択されていません。'); return; }
    setViewMode('input'); window.scrollTo(0, 0);
  };
  const handleStartLoad = async (idStr: string) => {
    const id = parseInt(idStr);
    if (isNaN(id)) { alert('有効な数字を入力してください'); return; }
    if (await executeLoadEstimate(id, false)) setViewMode('home');
  };
  const handleOpenEstimate = async (id: number) => {
    if (await executeLoadEstimate(id, false)) setViewMode('home');
  };
  const handleStartNew = () => {
    system.setSelectedOptions(new Set());
    system.setSelectedGrades(new Map());
    system.setFreeInputValues(new Map());
    system.setMultiGradeValues(new Map());
    system.setCategory('cremation');
    system.setSelectedPlanId(plans.find(p => p.category === 'cremation')?.id || 'plan_01');
    setLoadedCustomerInfo(null);
    system.setLoadedEstimateId(null);
    setViewMode('home');
  };

  // 印刷用ページはlocalStorageの内容だけで描画するため、ログインの前に返す
  if (isPrintMode) return <PrintPreview />;

  if (authLoading) return (
    <div className="fl-shell"><div className="fl-empty">読み込み中...</div></div>
  );
  if (!session) return <LoginGate logoType={logoType} />;

  // 接客時にお客様へお見せするカタログ。別タブで開く
  if (isCatalogMode) return <OptionCatalogPage />;

  if (loading) return (
    <div className="fl-shell"><div className="fl-empty">🌿 読み込み中...</div></div>
  );
  if (viewMode === 'top') return (
    <TopScreen
      logoType={logoType}
      onToggleLogo={toggleLogo}
      onCustomerList={() => setViewMode('customers')}
      onCreateNew={handleStartNew}
      onSearch={() => setViewMode('search')}
      onFlowerFunerals={() => setViewMode('flowerFunerals')}
      onFlowerOrders={() => setViewMode('flowerOrders')}
      onCaseTasks={() => setViewMode('caseTasks')}
    />
  );
  if (viewMode === 'caseTasks') return <CaseTaskPage onBack={() => setViewMode('top')} onOpenEstimate={handleOpenEstimate} />;
  if (viewMode === 'flowerFunerals') return <FlowerFuneralsPage onBack={() => setViewMode('top')} />;
  if (viewMode === 'flowerOrders') return <FlowerOrdersPage onBack={() => setViewMode('top')} />;
  if (viewMode === 'customers') return <CustomerListPage onBack={() => setViewMode('top')} onOpenEstimate={handleOpenEstimate} />;
  if (viewMode === 'search') return <EstimateSearchPage onBack={() => setViewMode('top')} onOpenEstimate={handleOpenEstimate} />;
  if (viewMode === 'start') return <StartScreen onLoad={handleStartLoad} onCreateNew={handleStartNew} logoType={logoType} onToggleLogo={toggleLogo} />;
  if (viewMode === 'input') return <CustomerInputPage onBack={() => setViewMode('home')} onSaveAndPrint={handleSaveAndPrint} isSaving={isSaving} initialData={loadedCustomerInfo} />;
  if (viewMode === 'home' && isMobile) return <MobileEstimatePage system={system} onOutputClick={handleOutputClick} onInvoiceClick={handleInvoiceClick} onReceiptClick={handleReceiptClick} goToInputPage={goToInputPage} onLoadClick={handleLoadEstimate} />;

  const includedItems = items.filter(i => i.allowedPlans.includes(selectedPlanId) && i.includedInPlans.includes(selectedPlanId));
  const optionItems = items.filter(i => i.allowedPlans.includes(selectedPlanId) && !i.includedInPlans.includes(selectedPlanId));

  return (
    <div className={`fl-shell fl-est is-${category}`}>
      <div className="print:hidden">
        <header className="fl-header">
          <div className="fl-header-left">
            <img
              src={`/images/logo${logoType}.png`}
              alt="Logo"
              onClick={toggleLogo}
              style={{ cursor: 'pointer' }}
              title="クリックでロゴ切替"
            />
            <h1>葬儀プランお見積り</h1>
            {system.loadedEstimateId && (
              <span className="fl-badge">案件 #{system.loadedEstimateId}</span>
            )}
          </div>

          <div className="fl-header-actions">
            <button type="button" className="fl-header-btn" onClick={() => setViewMode('top')}>
              <Home size={16} />
              TOP
            </button>
            <button
              type="button"
              className="fl-header-btn"
              onClick={() => window.open('/?catalog=true', '_blank')}
            >
              <Images size={16} />
              オプション画像
            </button>
            <button type="button" className="fl-header-btn" onClick={handleLoadEstimate}>
              <FolderOpen size={16} />
              呼出
            </button>
          </div>
        </header>

        <main className="fl-est-page">
          <div className="fl-est-layout">

            {/* ===== 左：プラン選択 ===== */}
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
            </div>

            {/* ===== 右：オプション ===== */}
            <div className="fl-est-main">
              <div className="fl-opt-panel">
                <div className="fl-opt-panel-head">プラン詳細・オプション選択</div>

                <div className="fl-opt-panel-body">

                  {/* --- プランに含まれるもの（開閉） --- */}
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
                          {isIncludedOpen ? '閉じる' : '表示'}
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

                              <div className="fl-opt-actions">
                                <button
                                  type="button"
                                  className="fl-info-btn"
                                  title="詳細を見る"
                                  onClick={() => setModalItem(item)}
                                >
                                  <Info size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- 追加オプション・変動費用 --- */}
                  {optionItems.length > 0 && (
                    <div className="fl-opt-group">
                      <div className="fl-opt-group-head is-static">
                        <span className="fl-opt-group-title">
                          <PlusCircle size={18} />
                          追加オプション・変動費用（{optionItems.length}点）
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
                                    <option value="">-- 選択してください --</option>
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
                                    value={freeInputValues.get(item.id) ?? 0}
                                    onChange={(v) => setFreeInputValue(item.id, v)}
                                  />
                                )}
                              </div>

                              <div className="fl-opt-actions">
                                <button
                                  type="button"
                                  className="fl-info-btn"
                                  title="詳細を見る"
                                  onClick={() => setModalItem(item)}
                                >
                                  <Info size={16} />
                                </button>
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
          </div>
        </main>

        <Footer total={totalCost} onInputClick={goToInputPage} onOutputClick={handleOutputClick} onInvoiceClick={handleInvoiceClick} onReceiptClick={handleReceiptClick} />
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
    </div>
  );
};

export default App;
