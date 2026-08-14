import { Plan, Item, MultiGradeSelection, CatalogProduct } from '../types';

export interface PrintData {
    plan: Plan;
    items: Item[];
    selectedOptions: number[];
    selectedGrades: [number, string][];
    freeInputValues: [number, number][];
    /** 数量入力型（供花など）。旧データには存在しない */
    multiGradeValues?: [number, MultiGradeSelection][];
    /** 選択肢の表示名を引くための商品マスタ。旧データには存在しない */
    catalogProducts?: CatalogProduct[];
    totalCost: number;
    customerInfo?: any;
    estimateId?: number;
    logoType?: 'FL' | 'LS';
    documentType?: 'quote' | 'invoice' | 'receipt';
}

export const serializePrintData = (
    plan: Plan,
    items: Item[],
    selectedOptions: Set<number>,
    selectedGrades: Map<number, string>,
    freeInputValues: Map<number, number>,
    multiGradeValues: Map<number, MultiGradeSelection>,
    catalogProducts: CatalogProduct[],
    totalCost: number,
    customerInfo?: any,
    estimateId?: number,
    logoType?: 'FL' | 'LS',
    documentType: 'quote' | 'invoice' | 'receipt' = 'quote'
): string => {
    const data: PrintData = {
        plan,
        items,
        selectedOptions: Array.from(selectedOptions),
        selectedGrades: Array.from(selectedGrades.entries()),
        freeInputValues: Array.from(freeInputValues.entries()),
        multiGradeValues: Array.from(multiGradeValues.entries()),
        catalogProducts,
        totalCost,
        customerInfo,
        estimateId,
        logoType,
        documentType
    };
    return JSON.stringify(data);
};

export const deserializePrintData = (json: string) => {
    try {
        const data: PrintData = JSON.parse(json);
        return {
            plan: data.plan,
            items: data.items,
            selectedOptions: new Set(data.selectedOptions),
            selectedGrades: new Map<number, string>(data.selectedGrades),
            freeInputValues: new Map<number, number>(data.freeInputValues),
            multiGradeValues: new Map<number, MultiGradeSelection>(data.multiGradeValues || []),
            catalogProducts: data.catalogProducts || [],
            totalCost: data.totalCost,
            customerInfo: data.customerInfo,
            estimateId: data.estimateId,
            logoType: data.logoType,
            documentType: data.documentType,
        };
    } catch (e) {
        console.error('Failed to parse print data:', e);
        return null;
    }
};
