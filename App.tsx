import React, { useEffect, useState } from 'react';
import { CustomerInfo } from './types';
import DetailModal from './components/DetailModal';
import Footer from './components/Footer';
import { Info, Check, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import PrintPreview from './components/PrintPreview';
import CustomerInputPage from './components/CustomerInputPage';
import StartScreen from './components/StartScreen';
import { useEstimateSystem } from './hooks/useEstimateSystem';
import MobileEstimatePage from './components/MobileEstimatePage';

const EMPTY_CUSTOMER_INFO: CustomerInfo = {
  deathDate: '', deceasedName: '', birthDate: '', age: '', address: '', honseki: '',
  applicantName: '', applicantRelation: '', applicantBirthDate: '',
  chiefMournerName: '', chiefMournerAddress: '', chiefMournerPhone: '', chiefMournerMobile: '',
  religion: '', templeName: '', templePhone: '', templeFax: '', remarks: ''
};

const THEME = {
  cremation: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', active: 'bg-purple-600 text-white shadow-md', dot: 'bg-purple-500', selectedBorder: 'border-purple-500 text-purple-700', optionBg: 'bg-purple-50/40' },
  funeral: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', active: 'bg-emerald-600 text-white shadow-md', dot: 'bg-emerald-500', selectedBorder: 'border-emerald-500 text-emerald-700', optionBg: 'bg-emerald-50/40' },
} as const;

/** 数値を3桁カンマ区切りで表示する入力欄 */
const MoneyInput: React.FC<{ value: number; onChange: (v: number) => void; className?: string }> = ({ value, onChange, className }) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');

  const handleFocus = () => {
    setEditing(true);
    setRaw(value ? String(value) : '');
  };
  const handleBlur = () => {
    setEditing(false);
    const parsed = parseInt(raw.replace(/,/g, ''));
    onChange(isNaN(parsed) ? 0 : parsed);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(e.target.value.replace(/[^0-9]/g, ''));
  };

  return (
    <div className={`flex items-center gap-1.5 ${className || ''}`}>
      <span className="text-base text-gray-500 font-medium">¥</span>
      <input
        type={editing ? 'text' : 'text'}
        inputMode="numeric"
        value={editing ? raw : (value ? value.toLocaleString() : '')}
        placeholder="0"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={editing ? handleChange : undefined}
        readOnly={!editing}
        className="w-36 text-base p-2.5 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono bg-white transition-shadow hover:border-gray-400 cursor-text"
      />
    </div>
  );
};

const App: React.FC = () => {
  const system = useEstimateSystem();
  const {
    isPrintMode, category, selectedPlanId,
    selectedOptions, selectedGrades, freeInputValues,
    modalItem, setModalItem, loadedCustomerInfo, setLoadedCustomerInfo,
    viewMode, setViewMode, isSaving, logoType,
    plans, items, loading,
    handleCategoryChange, handlePlanChange, toggleOption, setGrade, setFreeInputValue,
    currentPlan, totalCost, toggleLogo, handleSaveAndPrint, executeLoadEstimate
  } = system;

  const [isMobile, setIsMobile] = useState(false);
  const [isIncludedOpen, setIsIncludedOpen] = useState(true);
  const theme = THEME[category];

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
  const handleStartNew = () => {
    system.setSelectedOptions(new Set());
    system.setSelectedGrades(new Map());
    system.setFreeInputValues(new Map());
    system.setCategory('cremation');
    system.setSelectedPlanId(plans.find(p => p.category === 'cremation')?.id || 'plan_01');
    setLoadedCustomerInfo(null);
    setViewMode('home');
  };

  if (isPrintMode) return <PrintPreview />;
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center"><div className="text-4xl mb-4">🌿</div><div className="text-lg font-medium text-gray-600">読み込み中...</div></div>
    </div>
  );
  if (viewMode === 'start') return <StartScreen onLoad={handleStartLoad} onCreateNew={handleStartNew} logoType={logoType} onToggleLogo={toggleLogo} />;
  if (viewMode === 'input') return <CustomerInputPage onBack={() => setViewMode('home')} onSaveAndPrint={handleSaveAndPrint} isSaving={isSaving} initialData={loadedCustomerInfo} />;
  if (viewMode === 'home' && isMobile) return <MobileEstimatePage system={system} onOutputClick={handleOutputClick} onInvoiceClick={handleInvoiceClick} goToInputPage={goToInputPage} onLoadClick={handleLoadEstimate} />;

  const includedItems = items.filter(i => i.allowedPlans.includes(selectedPlanId) && i.includedInPlans.includes(selectedPlanId));
  const optionItems = items.filter(i => i.allowedPlans.includes(selectedPlanId) && !i.includedInPlans.includes(selectedPlanId));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 print:bg-white">
      <div className="contents print:hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-3 px-6 flex-shrink-0 relative">
          <button onClick={handleLoadEstimate} className="absolute top-3 right-4 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-colors">呼出</button>
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={toggleLogo} title="Click to switch logo">
              <img src={`/images/logo${logoType}.png`} alt="Logo" className="h-8 w-auto object-contain" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-wide">葬儀プランお見積り</h1>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ===== Left: Plan Selection ===== */}
            <div className="lg:col-span-4 flex flex-col gap-4 sticky top-4 h-fit">
              {/* Category Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-200 rounded-xl">
                <button onClick={() => handleCategoryChange('cremation')}
                  className={`py-2.5 px-4 rounded-lg font-bold transition-all text-base ${category === 'cremation' ? THEME.cremation.active : 'bg-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                  火葬式プラン
                </button>
                <button onClick={() => handleCategoryChange('funeral')}
                  className={`py-2.5 px-4 rounded-lg font-bold transition-all text-base ${category === 'funeral' ? THEME.funeral.active : 'bg-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                  葬儀プラン
                </button>
              </div>

              {/* Plan Cards */}
              <div className={`p-5 rounded-2xl border-2 transition-colors duration-300 ${theme.bg} ${theme.border}`}>
                <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${theme.text}`}>
                  <Check size={18} /> プラン選択
                </h2>
                <div className="space-y-2.5">
                  {plans.filter(p => p.category === category).map(plan => (
                    <label key={plan.id}
                      className={`block relative cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedPlanId === plan.id
                        ? `bg-white shadow-md ${theme.selectedBorder}`
                        : 'bg-white/60 border-transparent hover:bg-white hover:shadow-sm text-gray-600'}`}>
                      <input type="radio" name="plan" value={plan.id} checked={selectedPlanId === plan.id} onChange={() => handlePlanChange(plan.id)} className="sr-only" />
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-lg">{plan.name}</span>
                        <span className="font-bold text-xl font-mono">¥{plan.price.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-500 leading-snug">{plan.description}</p>
                      {selectedPlanId === plan.id && <div className={`absolute top-4 right-4 w-3.5 h-3.5 rounded-full ${theme.dot}`}></div>}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 text-right">※ 表示価格は税抜です</p>
              </div>
            </div>

            {/* ===== Right: Options ===== */}
            <div className="lg:col-span-8 flex flex-col">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                <div className={`p-4 border-b border-gray-100 ${theme.bg} rounded-t-2xl`}>
                  <h2 className={`font-bold text-lg ${theme.text}`}>プラン詳細・オプション選択</h2>
                </div>

                <div className="p-4 space-y-2">

                  {/* --- Included Items Accordion --- */}
                  {includedItems.length > 0 && (
                    <div className="border border-emerald-200 rounded-xl overflow-hidden">
                      <div className="bg-emerald-50 hover:bg-emerald-100/80 cursor-pointer transition-colors px-4 py-3"
                        onClick={() => setIsIncludedOpen(!isIncludedOpen)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-emerald-700 text-base">
                            <CheckCircle2 size={20} />
                            プランに含まれるもの ({includedItems.length}点)
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-normal text-gray-500">{isIncludedOpen ? '閉じる' : '表示'}</span>
                            {isIncludedOpen ? <ChevronUp size={20} className="text-emerald-600" /> : <ChevronDown size={20} className="text-emerald-600" />}
                          </div>
                        </div>
                      </div>

                      {isIncludedOpen && (
                        <div className="divide-y divide-emerald-100 bg-white">
                          {includedItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-emerald-50/30 transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
                                <span className="text-base font-medium text-gray-800">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {item.type === 'dropdown' && item.options ? (
                                  <select
                                    className="text-sm p-2.5 pr-8 border border-gray-300 rounded-lg bg-white shadow-sm cursor-pointer appearance-none hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all min-w-[200px]"
                                    value={selectedGrades.get(item.id) || ''}
                                    onChange={(e) => setGrade(item.id, e.target.value)}>
                                    <option value="">基本（プラン内）</option>
                                    {item.options.filter(o => o.allowedPlans.includes(selectedPlanId)).map(opt => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.name}（+¥{(opt.planPrices?.[selectedPlanId] ?? opt.price).toLocaleString()}）
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-medium">プランに含む</span>
                                )}
                                <button onClick={() => setModalItem(item)} className="text-gray-400 hover:text-emerald-600 transition-colors p-1 rounded-full hover:bg-emerald-50">
                                  <Info size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- Options Section Header --- */}
                  {optionItems.length > 0 && (
                    <div className="border border-emerald-200 mt-4 px-4 py-3 bg-emerald-50">
                      <div className="flex items-center gap-2 font-bold text-emerald-700 text-base">
                        <ChevronDown size={20} className="text-emerald-600" />
                        追加オプション・変動費用 ({optionItems.length}点)
                      </div>
                    </div>
                  )}

                  {/* --- Option Items (テーブル形式) --- */}
                  <table className="w-full">
                    <tbody>
                      {optionItems.map(item => {
                        const isSelected = item.type === 'checkbox' ? selectedOptions.has(item.id)
                          : item.type === 'dropdown' ? selectedGrades.has(item.id)
                          : (freeInputValues.get(item.id) ?? 0) > 0;

                        return (
                          <tr key={item.id}
                            className={`border-b border-gray-100 last:border-0 transition-colors ${isSelected ? theme.optionBg : 'hover:bg-gray-50'}`}>
                            {/* 項目名 */}
                            <td className="py-3 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-800 text-base whitespace-nowrap">{item.name}</span>
                                {item.nonTaxable && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">非課税</span>
                                )}
                                <button onClick={() => setModalItem(item)}
                                  className="text-gray-400 hover:text-emerald-600 transition-colors p-0.5 rounded-full hover:bg-gray-100">
                                  <Info size={17} />
                                </button>
                              </div>
                              {item.type === 'checkbox' && item.basePrice ? (
                                <div className="text-sm text-gray-500 font-mono mt-0.5">¥{item.basePrice.toLocaleString()}</div>
                              ) : null}
                            </td>
                            {/* コントロール */}
                            <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                              {item.type === 'checkbox' && (
                                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                                  <input type="checkbox" checked={selectedOptions.has(item.id)} onChange={() => toggleOption(item.id)}
                                    className="rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                                    style={{ width: '20px', height: '20px' }} />
                                  <span className="text-sm font-medium text-gray-600">追加</span>
                                </label>
                              )}

                              {item.type === 'dropdown' && item.options && (
                                <div className="relative inline-block">
                                  <select
                                    className="text-sm p-2.5 pr-9 border border-gray-300 rounded-lg bg-white cursor-pointer appearance-none hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all min-w-[220px]"
                                    value={selectedGrades.get(item.id) || ''}
                                    onChange={(e) => setGrade(item.id, e.target.value)}>
                                    <option value="">-- 選択してください --</option>
                                    {item.options.filter(o => o.allowedPlans.includes(selectedPlanId)).map(opt => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.name}（¥{(opt.planPrices?.[selectedPlanId] ?? opt.price).toLocaleString()}）
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                              )}

                              {item.type === 'free_input' && (
                                <MoneyInput
                                  value={freeInputValues.get(item.id) ?? 0}
                                  onChange={(v) => setFreeInputValue(item.id, v)}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* フッターに隠れないようにスペース確保 */}
          <div style={{ height: '180px' }} aria-hidden="true"></div>
        </main>

        <Footer total={totalCost} onInputClick={goToInputPage} onOutputClick={handleOutputClick} onInvoiceClick={handleInvoiceClick} />
        {modalItem && <DetailModal item={modalItem} onClose={() => setModalItem(null)} />}
      </div>
    </div>
  );
};

export default App;
