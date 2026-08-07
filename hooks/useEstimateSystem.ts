import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PlanCategory, PlanId, Item, Plan, CustomerInfo, MultiGradeSelection, DiscountType } from '../types';
import { serializePrintData } from '../lib/serialization';
import { getItemPrice, emptyMultiGrade } from '../lib/pricing';
import { convertDbItem, convertDbPlan } from '../lib/converter';
import { findOrCreateCustomerForEstimate } from '../lib/customers';
import { statusAfterDocument, EstimateStatus } from '../lib/estimateStatus';
import { completeTasksForDocument } from '../lib/caseTasks';
import { PLANS, ITEMS } from '../constants';

export const useEstimateSystem = () => {
    const [isPrintMode, setIsPrintMode] = useState(false);

    // --- State ---
    const [category, setCategory] = useState<PlanCategory>('cremation');
    const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('plan_01');
    const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());
    const [selectedGrades, setSelectedGrades] = useState<Map<number, string>>(new Map());
    const [freeInputValues, setFreeInputValues] = useState<Map<number, number>>(new Map());
    // 数量入力型（供花など）: アイテムID → グレードごとの個数と割引
    const [multiGradeValues, setMultiGradeValues] = useState<Map<number, MultiGradeSelection>>(new Map());
    const [modalItem, setModalItem] = useState<Item | null>(null);
    // 数量入力型の入力モーダルで開いているアイテム
    const [multiGradeModalItem, setMultiGradeModalItem] = useState<Item | null>(null);
    const [loadedCustomerInfo, setLoadedCustomerInfo] = useState<CustomerInfo | null>(null);
    // 読み込み中の案件（見積）。ある場合は帳票を出しても新規採番せず、この案件を更新する
    const [loadedEstimateId, setLoadedEstimateId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'top' | 'customers' | 'search' | 'caseTasks' | 'flowerFunerals' | 'flowerOrders' | 'start' | 'home' | 'input'>('top');
    const [isSaving, setIsSaving] = useState(false);
    const [logoType, setLogoType] = useState<'FL' | 'LS'>('FL');

    // Supabase data (fallback to constants)
    const [plans, setPlans] = useState<Plan[]>(PLANS);
    const [items, setItems] = useState<Item[]>(ITEMS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('print') === 'true') {
            setIsPrintMode(true);
            return;
        }
        if (isPrintMode) return;

        const fetchData = async () => {
            try {
                const { data: plansData, error: plansError } = await supabase
                    .from('plans').select('*').order('display_order', { ascending: true });
                if (plansError) throw plansError;
                
                const { data: itemsData, error: itemsError } = await supabase
                    .from('items').select('*').order('display_order', { ascending: true });
                if (itemsError) throw itemsError;

                if (plansData && plansData.length > 0) {
                    setPlans(plansData.map(convertDbPlan));
                }
                if (itemsData && itemsData.length > 0) {
                    setItems(itemsData.map(convertDbItem));
                }
            } catch (error) {
                console.error("Failed to fetch data from Supabase:", error);
                // DBの読み込みに失敗した場合はハードコードされた定数を利用する
                setPlans(PLANS);
                setItems(ITEMS);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isPrintMode]);

    // --- Handlers ---
    const handleCategoryChange = (newCat: PlanCategory) => {
        setCategory(newCat);
        const firstPlan = plans.find(p => p.category === newCat);
        if (firstPlan) setSelectedPlanId(firstPlan.id);
        setSelectedOptions(new Set());
        setSelectedGrades(new Map());
        setFreeInputValues(new Map());
        setMultiGradeValues(new Map());
    };

    const handlePlanChange = (planId: PlanId) => {
        setSelectedPlanId(planId);
        // ドロップダウンの選択肢がプランに対応しない場合はクリア
        setSelectedGrades(prev => {
            const next = new Map(prev);
            for (const [itemId, gradeId] of next.entries()) {
                const item = items.find(i => i.id === itemId);
                if (item?.options) {
                    const opt = item.options.find(o => o.id === gradeId);
                    if (opt && !opt.allowedPlans.includes(planId)) {
                        next.delete(itemId);
                    }
                }
            }
            return next;
        });
        // 数量入力型も、プランに対応しないグレードの個数を落とす
        setMultiGradeValues(prev => {
            const next = new Map(prev);
            for (const [itemId, selection] of next.entries()) {
                const item = items.find(i => i.id === itemId);
                if (!item?.options) continue;
                const quantities: Record<string, number> = {};
                for (const [gradeId, qty] of Object.entries(selection.quantities)) {
                    const opt = item.options.find(o => o.id === gradeId);
                    if (opt && opt.allowedPlans.includes(planId)) quantities[gradeId] = qty;
                }
                next.set(itemId, { ...selection, quantities });
            }
            return next;
        });
    };

    const toggleOption = (itemId: number) => {
        const newSet = new Set(selectedOptions);
        if (newSet.has(itemId)) newSet.delete(itemId);
        else newSet.add(itemId);
        setSelectedOptions(newSet);
    };

    const setGrade = (itemId: number, gradeId: string) => {
        const newMap = new Map(selectedGrades);
        if (gradeId === '') newMap.delete(itemId);
        else newMap.set(itemId, gradeId);
        setSelectedGrades(newMap);
    };

    const setFreeInputValue = (itemId: number, value: number) => {
        const newMap = new Map(freeInputValues);
        if (value === 0) newMap.delete(itemId);
        else newMap.set(itemId, value);
        setFreeInputValues(newMap);
    };

    /** 数量入力型: グレードごとの個数を設定する */
    const setGradeQuantity = (itemId: number, gradeId: string, quantity: number) => {
        setMultiGradeValues(prev => {
            const next = new Map(prev);
            const current = next.get(itemId) ?? emptyMultiGrade();
            const quantities = { ...current.quantities };
            if (quantity > 0) quantities[gradeId] = quantity;
            else delete quantities[gradeId];
            next.set(itemId, { ...current, quantities });
            return next;
        });
    };

    /** 数量入力型: 小計に対する割引を設定する */
    const setItemDiscount = (itemId: number, discountType: DiscountType, discountValue: number) => {
        setMultiGradeValues(prev => {
            const next = new Map(prev);
            const current = next.get(itemId) ?? emptyMultiGrade();
            next.set(itemId, {
                ...current,
                discountType,
                discountValue: discountType === 'none' ? 0 : discountValue,
            });
            return next;
        });
    };

    // --- Calculations ---
    const currentPlan = plans.find(p => p.id === selectedPlanId);

    const totalCost = useMemo(() => {
        if (!currentPlan) return 0;
        let total = currentPlan.price;

        items.forEach(item => {
            if (!item.allowedPlans.includes(selectedPlanId)) return;
            total += getItemPrice(item, selectedPlanId, selectedOptions, selectedGrades, freeInputValues, multiGradeValues);
        });

        return total;
    }, [currentPlan, selectedPlanId, selectedOptions, selectedGrades, freeInputValues, multiGradeValues, items]);

    const toggleLogo = () => setLogoType(prev => prev === 'FL' ? 'LS' : 'FL');

    const handleSaveAndPrint = async (customerInfo: CustomerInfo, documentType: 'quote' | 'invoice' | 'receipt' = 'quote') => {
        if (!currentPlan) return;
        try {
            setIsSaving(true);
            const dataToSave = {
                plan: currentPlan, items,
                selectedOptions: Array.from(selectedOptions),
                selectedGrades: Array.from(selectedGrades.entries()),
                freeInputValues: Array.from(freeInputValues.entries()),
                multiGradeValues: Array.from(multiGradeValues.entries()),
                totalCost, customerInfo, logoType
            };

            // 顧客名が入力されていれば顧客を用意して紐付ける（同名の顧客は再利用）
            let customerId: string | null = null;
            try {
                customerId = await findOrCreateCustomerForEstimate(customerInfo);
            } catch (customerError) {
                // 顧客の紐付けに失敗しても見積の保存自体は続行する（後から画面で紐付け可能）
                console.error('Failed to link customer:', customerError);
            }

            const issuedColumn = {
                quote: 'quote_issued_at',
                invoice: 'invoice_issued_at',
                receipt: 'receipt_issued_at',
            }[documentType];

            const now = new Date().toISOString();
            let estimateId = loadedEstimateId;

            if (estimateId) {
                // 既存の案件を更新する（帳票を出し直しても番号は変わらない）
                const { data: current, error: fetchError } = await supabase
                    .from('estimates').select('status').eq('id', estimateId).single();
                if (fetchError) throw fetchError;

                const { error } = await supabase
                    .from('estimates')
                    .update({
                        content: dataToSave,
                        customer_info: customerInfo,
                        total_price: totalCost,
                        customer_id: customerId,
                        status: statusAfterDocument((current?.status ?? 'quoted') as EstimateStatus, documentType),
                        [issuedColumn]: now,
                    })
                    .eq('id', estimateId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('estimates')
                    .insert([{
                        content: dataToSave,
                        customer_info: customerInfo,
                        total_price: totalCost,
                        customer_id: customerId,
                        status: statusAfterDocument('quoted', documentType),
                        [issuedColumn]: now,
                    }])
                    .select().single();

                if (error) throw error;
                estimateId = data.id;
                setLoadedEstimateId(estimateId);
            }

            setLoadedCustomerInfo(customerInfo);

            // 帳票の発行に連動してタスクを完了させる（請求書→請求書の送付／領収書→入金の確認）。
            // タスクが未生成の案件でも何も起きないだけなので、失敗しても帳票の発行は続行する。
            try {
                await completeTasksForDocument(estimateId!, documentType);
            } catch (taskError) {
                console.error('Failed to complete tasks for document:', taskError);
            }

            const serialized = serializePrintData(
                currentPlan, items, selectedOptions, selectedGrades, freeInputValues, multiGradeValues,
                totalCost, customerInfo, estimateId!, logoType, documentType
            );
            localStorage.setItem('print_data', serialized);
            const isMobile = new URLSearchParams(window.location.search).get('mobile') === 'true';
            window.open(`/?print=true${isMobile ? '&mobile=true' : ''}`, '_blank');
        } catch (error) {
            console.error('Error saving estimate:', error);
            alert('保存に失敗しました。もう一度お試しください。');
        } finally {
            setIsSaving(false);
        }
    };

    const executeLoadEstimate = async (id: number, showSuccessAlert = true) => {
        try {
            const { data, error } = await supabase
                .from('estimates').select('*').eq('id', id).single();

            if (error || !data) { alert('見積データが見つかりませんでした'); return false; }
            const content = data.content;
            if (!content) { alert('データの形式が正しくありません'); return false; }

            if (content.plan?.id) {
                const planDef = plans.find(p => p.id === content.plan.id);
                if (planDef) {
                    setSelectedPlanId(content.plan.id);
                    setCategory(planDef.category);
                } else {
                    // 旧プランIDが現行PLANSに存在しない場合のフォールバック
                    alert('プラン構成が変更されました。デフォルトプランで読み込みます。');
                    setSelectedPlanId('plan_01');
                    setCategory('cremation');
                }
            }
            if (content.selectedOptions) setSelectedOptions(new Set(content.selectedOptions));
            if (content.freeInputValues) setFreeInputValues(new Map<number, number>(content.freeInputValues));

            const loadedGrades = new Map<number, string>(content.selectedGrades || []);
            // 旧データには multiGradeValues が無いので、無ければ空から始める
            const loadedMultiGrades = new Map<number, MultiGradeSelection>(content.multiGradeValues || []);
            // 数量入力型に変わったアイテムがプルダウンで選ばれていたら、個数1として引き継ぐ
            for (const [itemId, gradeId] of Array.from(loadedGrades.entries())) {
                if (items.find(i => i.id === itemId)?.type !== 'multi_grade') continue;
                if (!loadedMultiGrades.has(itemId)) {
                    loadedMultiGrades.set(itemId, { ...emptyMultiGrade(), quantities: { [gradeId]: 1 } });
                }
                loadedGrades.delete(itemId);
            }
            setSelectedGrades(loadedGrades);
            setMultiGradeValues(loadedMultiGrades);
            if (content.logoType) setLogoType(content.logoType);
            if (content.customerInfo) setLoadedCustomerInfo(content.customerInfo);
            setLoadedEstimateId(id);
            if (showSuccessAlert) alert(`見積番号 ${id} を読み込みました。`);
            return true;
        } catch (e) {
            console.error('Unexpected error loading estimate:', e);
            alert('読み込み中にエラーが発生しました');
            return false;
        }
    };

    return {
        isPrintMode, setIsPrintMode,
        category, setCategory,
        selectedPlanId, setSelectedPlanId,
        selectedOptions, setSelectedOptions,
        selectedGrades, setSelectedGrades,
        freeInputValues, setFreeInputValues,
        multiGradeValues, setMultiGradeValues,
        modalItem, setModalItem,
        multiGradeModalItem, setMultiGradeModalItem,
        loadedCustomerInfo, setLoadedCustomerInfo,
        loadedEstimateId, setLoadedEstimateId,
        viewMode, setViewMode,
        isSaving, logoType,
        plans, items, loading,
        handleCategoryChange, handlePlanChange, toggleOption, setGrade, setFreeInputValue,
        setGradeQuantity, setItemDiscount,
        currentPlan, totalCost, toggleLogo, handleSaveAndPrint, executeLoadEstimate
    };
};
