import React, { useEffect, useState } from 'react';
import { CustomerInfo } from './types';
import DetailModal from './components/DetailModal';
import Footer from './components/Footer';
import { Info, Check } from 'lucide-react';
import PrintPreview from './components/PrintPreview';
import CustomerInputPage from './components/CustomerInputPage';
import StartScreen from './components/StartScreen';
import { useEstimateSystem } from './hooks/useEstimateSystem';
import MobileEstimatePage from './components/MobileEstimatePage';

const EMPTY_CUSTOMER_INFO: CustomerInfo = {
  deathDate: '',
  deceasedName: '',
  birthDate: '',
  age: '',
  address: '',
  honseki: '',
  applicantName: '',
  applicantRelation: '',
  applicantBirthDate: '',
  chiefMournerName: '',
  chiefMournerAddress: '',
  chiefMournerPhone: '',
  chiefMournerMobile: '',
  religion: '',
  templeName: '',
  templePhone: '',
  templeFax: '',
  remarks: ''
};

const App: React.FC = () => {
  const system = useEstimateSystem();
  const {
    isPrintMode,
    selectedPlanId,
    optionValues,
    modalItem, setModalItem,
    loadedCustomerInfo, setLoadedCustomerInfo,
    viewMode, setViewMode,
    isSaving,
    logoType,
    plans, items, loading,
    handlePlanChange, setOptionValue,
    currentPlan, totalCost, toggleLogo, handleSaveAndPrint, executeLoadEstimate
  } = system;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'start') {
      setViewMode('start');
    }
    if (params.get('mobile') === 'true') {
      setIsMobile(true);
      setViewMode('start');
    }
  }, []);

  // --- Handlers ---

  const handleOutputClick = async () => {
    if (!currentPlan) {
      alert('プランが選択されていません。');
      return;
    }
    await handleSaveAndPrint(loadedCustomerInfo || EMPTY_CUSTOMER_INFO);
  };

  const handleInvoiceClick = async () => {
    if (!currentPlan) {
      alert('プランが選択されていません。');
      return;
    }
    await handleSaveAndPrint(loadedCustomerInfo || EMPTY_CUSTOMER_INFO, 'invoice');
  };

  const handleLoadEstimate = async () => {
    const input = window.prompt('呼び出す見積番号を入力してください');
    if (!input) return;
    const id = parseInt(input);
    if (isNaN(id)) {
      alert('有効な数字を入力してください');
      return;
    }
    await executeLoadEstimate(id);
  };

  const goToInputPage = () => {
    if (!currentPlan) {
      alert('プランが選択されていません。');
      return;
    }
    setViewMode('input');
    window.scrollTo(0, 0);
  };

  const handleBackToHome = () => {
    setViewMode('home');
  };

  const handleStartLoad = async (idStr: string) => {
    const id = parseInt(idStr);
    if (isNaN(id)) {
      alert('有効な数字を入力してください');
      return;
    }
    const success = await executeLoadEstimate(id, false);
    if (success) {
      setViewMode('home');
    }
  };

  const handleStartNew = () => {
    system.setOptionValues(new Map());
    if (plans.length > 0) {
      system.setSelectedPlanId(plans[0].id);
    }
    setLoadedCustomerInfo(null);
    setViewMode('home');
  };

  // --- Render ---

  if (isPrintMode) {
    return <PrintPreview />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🌿</div>
          <div className="text-lg font-medium text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (viewMode === 'start') {
    return (
      <StartScreen
        onLoad={handleStartLoad}
        onCreateNew={handleStartNew}
        logoType={logoType}
        onToggleLogo={toggleLogo}
      />
    );
  }

  if (viewMode === 'input') {
    return (
      <CustomerInputPage
        onBack={handleBackToHome}
        onSaveAndPrint={handleSaveAndPrint}
        isSaving={isSaving}
        initialData={loadedCustomerInfo}
      />
    );
  }

  if (viewMode === 'home' && isMobile) {
    return (
      <MobileEstimatePage
        system={system}
        onOutputClick={handleOutputClick}
        onInvoiceClick={handleInvoiceClick}
        goToInputPage={goToInputPage}
        onLoadClick={handleLoadEstimate}
      />
    );
  }

  // Desktop Home View
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 print:bg-white">
      <div className="contents print:hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-3 px-6 flex-shrink-0 relative">
          <button
            onClick={handleLoadEstimate}
            className="absolute top-3 right-4 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-400 rounded px-2 py-1 transition-colors"
          >
            呼出
          </button>

          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={toggleLogo}
              title="Click to switch logo"
            >
              <img
                src={`/images/logo${logoType}.png`}
                alt="Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-wide">
              葬儀プランお見積り
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-48">

            {/* Left Column: Plan Selection */}
            <div className="lg:col-span-4 flex flex-col gap-4 sticky top-4 h-fit">
              <div className="p-4 rounded-2xl border-2 bg-emerald-50 border-emerald-200 transition-colors duration-300">
                <h2 className="text-base font-bold mb-3 flex items-center gap-2 text-emerald-700">
                  <Check size={18} /> プラン選択
                </h2>
                <div className="space-y-2">
                  {plans.map(plan => (
                    <label
                      key={plan.id}
                      className={`block relative cursor-pointer p-3 rounded-xl border-2 transition-all ${selectedPlanId === plan.id
                        ? 'bg-white border-emerald-500 text-emerald-700 shadow-sm'
                        : 'bg-white/50 border-transparent hover:bg-white text-gray-600'
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
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-base">{plan.name}</span>
                        <span className="font-bold text-lg">¥{plan.price.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{plan.description}</p>
                      {selectedPlanId === plan.id && (
                        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-emerald-500"></div>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 text-right">※ 価格は全て税込表示です</p>
              </div>
            </div>

            {/* Right Column: Options */}
            <div className="lg:col-span-8 flex flex-col">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-emerald-50">
                  <h2 className="font-bold text-lg text-emerald-700">追加費用・オプション</h2>
                  <p className="text-xs text-gray-500 mt-1">該当する項目に金額を入力してください（税込）</p>
                </div>

                <div className="p-4">
                  <div className="space-y-3">
                    {items.map(item => {
                      const value = optionValues.get(item.id) ?? 0;
                      return (
                        <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${value > 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-800">{item.name}</h3>
                              <button
                                onClick={() => setModalItem(item)}
                                className="text-gray-400 hover:text-emerald-600 transition-colors"
                              >
                                <Info size={16} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-sm text-gray-500">¥</span>
                            <input
                              type="number"
                              value={value || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setOptionValue(item.id, isNaN(val) ? 0 : val);
                              }}
                              placeholder="0"
                              className="w-28 text-sm p-2 border border-gray-300 rounded-lg text-right focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer
          total={totalCost}
          onInputClick={goToInputPage}
          onOutputClick={handleOutputClick}
          onInvoiceClick={handleInvoiceClick}
        />

        {/* Detail Modal */}
        {modalItem && (
          <DetailModal
            item={modalItem}
            onClose={() => setModalItem(null)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
