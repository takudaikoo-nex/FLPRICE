import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PlanCategory, PlanId, Item, Plan, CustomerInfo } from '../types';
import { serializePrintData } from '../lib/serialization';
import { getItemPrice } from '../lib/pricing';
import { PLANS, ITEMS } from '../constants';

export const useEstimateSystem = () => {
    const [isPrintMode, setIsPrintMode] = useState(false);

    // --- State ---
    const [category, setCategory] = useState<PlanCategory>('cremation');
    const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('plan_01');
    const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());
    const [selectedGrades, setSelectedGrades] = useState<Map<number, string>>(new Map());
    const [freeInputValues, setFreeInputValues] = useState<Map<number, number>>(new Map());
    const [modalItem, setModalItem] = useState<Item | null>(null);
    const [loadedCustomerInfo, setLoadedCustomerInfo] = useState<CustomerInfo | null>(null);
    const [viewMode, setViewMode] = useState<'start' | 'home' | 'input'>('home');
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

        // ローカル定数をマスターデータとして使用
        // （Supabase DBは見積保存・読込のみに利用）
        setPlans(PLANS);
        setItems(ITEMS);
        setLoading(false);
    }, [isPrintMode]);

    // --- Handlers ---
    const handleCategoryChange = (newCat: PlanCategory) => {
        setCategory(newCat);
        const firstPlan = plans.find(p => p.category === newCat);
        if (firstPlan) setSelectedPlanId(firstPlan.id);
        setSelectedOptions(new Set());
        setSelectedGrades(new Map());
        setFreeInputValues(new Map());
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

    // --- Calculations ---
    const currentPlan = plans.find(p => p.id === selectedPlanId);

    const totalCost = useMemo(() => {
        if (!currentPlan) return 0;
        let total = currentPlan.price;

        items.forEach(item => {
            if (!item.allowedPlans.includes(selectedPlanId)) return;
            total += getItemPrice(item, selectedPlanId, selectedOptions, selectedGrades, freeInputValues);
        });

        return total;
    }, [currentPlan, selectedPlanId, selectedOptions, selectedGrades, freeInputValues, items]);

    const toggleLogo = () => setLogoType(prev => prev === 'FL' ? 'LS' : 'FL');

    const handleSaveAndPrint = async (customerInfo: CustomerInfo, documentType: 'quote' | 'invoice' = 'quote') => {
        if (!currentPlan) return;
        try {
            setIsSaving(true);
            const dataToSave = {
                plan: currentPlan, items,
                selectedOptions: Array.from(selectedOptions),
                selectedGrades: Array.from(selectedGrades.entries()),
                freeInputValues: Array.from(freeInputValues.entries()),
                totalCost, customerInfo, logoType
            };

            const { data, error } = await supabase
                .from('estimates')
                .insert([{ content: dataToSave, customer_info: customerInfo, total_price: totalCost }])
                .select().single();

            if (error) throw error;
            setLoadedCustomerInfo(customerInfo);

            const serialized = serializePrintData(
                currentPlan, items, selectedOptions, selectedGrades, freeInputValues,
                totalCost, customerInfo, data.id, logoType, documentType
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
                setSelectedPlanId(content.plan.id);
                const planDef = plans.find(p => p.id === content.plan.id);
                if (planDef) setCategory(planDef.category);
            }
            if (content.selectedOptions) setSelectedOptions(new Set(content.selectedOptions));
            if (content.selectedGrades) setSelectedGrades(new Map<number, string>(content.selectedGrades));
            if (content.freeInputValues) setFreeInputValues(new Map<number, number>(content.freeInputValues));
            if (content.logoType) setLogoType(content.logoType);
            if (content.customerInfo) setLoadedCustomerInfo(content.customerInfo);
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
        modalItem, setModalItem,
        loadedCustomerInfo, setLoadedCustomerInfo,
        viewMode, setViewMode,
        isSaving, logoType,
        plans, items, loading,
        handleCategoryChange, handlePlanChange, toggleOption, setGrade, setFreeInputValue,
        currentPlan, totalCost, toggleLogo, handleSaveAndPrint, executeLoadEstimate
    };
};
