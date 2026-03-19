import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PlanId, Item, Plan, CustomerInfo } from '../types';
import { serializePrintData } from '../lib/serialization';
import { calculateTotal } from '../lib/pricing';
import { convertDbItem, convertDbPlan } from '../lib/converter';

export const useEstimateSystem = () => {
    const [isPrintMode, setIsPrintMode] = useState(false);

    // --- State ---
    const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('');
    const [optionValues, setOptionValues] = useState<Map<number, number>>(new Map());

    // Modal & View state
    const [modalItem, setModalItem] = useState<Item | null>(null);
    const [loadedCustomerInfo, setLoadedCustomerInfo] = useState<CustomerInfo | null>(null);
    const [viewMode, setViewMode] = useState<'start' | 'home' | 'input'>('home');
    const [isSaving, setIsSaving] = useState(false);

    // Logo Toggle State
    const [logoType, setLogoType] = useState<'FL' | 'LS'>('FL');

    // Supabase data
    const [plans, setPlans] = useState<Plan[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch data from Supabase
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
                    .from('plans')
                    .select('*')
                    .order('id');

                if (plansError) throw plansError;

                const { data: itemsData, error: itemsError } = await supabase
                    .from('items')
                    .select('*')
                    .order('display_order', { ascending: true });

                if (itemsError) throw itemsError;

                const convertedPlans = (plansData || []).map(convertDbPlan);
                const convertedItems = (itemsData || []).map(convertDbItem);

                setPlans(convertedPlans);
                setItems(convertedItems);

                // 最初のプランをデフォルト選択
                if (convertedPlans.length > 0 && !selectedPlanId) {
                    setSelectedPlanId(convertedPlans[0].id);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('データの読み込みに失敗しました。コンソールを確認してください。');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isPrintMode]);

    // --- Handlers ---

    const handlePlanChange = (planId: PlanId) => {
        setSelectedPlanId(planId);
    };

    const setOptionValue = (itemId: number, value: number) => {
        const newMap = new Map(optionValues);
        if (value === 0) {
            newMap.delete(itemId);
        } else {
            newMap.set(itemId, value);
        }
        setOptionValues(newMap);
    };

    // --- Calculations ---

    const currentPlan = plans.find(p => p.id === selectedPlanId);

    const totalCost = useMemo(() => {
        if (!currentPlan) return 0;
        return calculateTotal(currentPlan, optionValues);
    }, [currentPlan, optionValues]);

    const toggleLogo = () => {
        setLogoType(prev => prev === 'FL' ? 'LS' : 'FL');
    };

    const handleSaveAndPrint = async (customerInfo: CustomerInfo, documentType: 'quote' | 'invoice' = 'quote') => {
        if (!currentPlan) return;

        try {
            setIsSaving(true);
            const dataToSave = {
                plan: currentPlan,
                items,
                optionValues: Array.from(optionValues.entries()),
                totalCost,
                customerInfo,
                logoType
            };

            const { data, error } = await supabase
                .from('estimates')
                .insert([
                    {
                        content: dataToSave,
                        customer_info: customerInfo,
                        total_price: totalCost
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            const estimateId = data.id;
            setLoadedCustomerInfo(customerInfo);

            const serializedData = serializePrintData(
                currentPlan,
                items,
                optionValues,
                totalCost,
                customerInfo,
                estimateId,
                logoType,
                documentType
            );

            localStorage.setItem('print_data', serializedData);
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
                .from('estimates')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                alert('見積データが見つかりませんでした');
                return false;
            }

            const content = data.content;
            if (!content) {
                alert('データの形式が正しくありません');
                return false;
            }

            if (content.plan?.id) {
                setSelectedPlanId(content.plan.id);
            }

            if (content.optionValues) {
                setOptionValues(new Map<number, number>(content.optionValues));
            }

            if (content.logoType) setLogoType(content.logoType);

            if (content.customerInfo) {
                setLoadedCustomerInfo(content.customerInfo);
            }

            if (showSuccessAlert) {
                alert(`見積番号 ${id} を読み込みました。`);
            }
            return true;

        } catch (e) {
            console.error('Unexpected error loading estimate:', e);
            alert('読み込み中にエラーが発生しました');
            return false;
        }
    };

    return {
        isPrintMode, setIsPrintMode,
        selectedPlanId, setSelectedPlanId,
        optionValues, setOptionValues,
        modalItem, setModalItem,
        loadedCustomerInfo, setLoadedCustomerInfo,
        viewMode, setViewMode,
        isSaving, setIsSaving,
        logoType, setLogoType,
        plans, items, loading,
        handlePlanChange, setOptionValue,
        currentPlan, totalCost, toggleLogo, handleSaveAndPrint, executeLoadEstimate
    };
};
