import { Plan, Item } from '../types';

export interface PrintData {
    plan: Plan;
    items: Item[];
    selectedOptions: number[];
    selectedGrades: [number, string][];
    freeInputValues: [number, number][];
    totalCost: number;
    customerInfo?: any;
    estimateId?: number;
    logoType?: 'FL' | 'LS';
    documentType?: 'quote' | 'invoice';
}

export const serializePrintData = (
    plan: Plan,
    items: Item[],
    selectedOptions: Set<number>,
    selectedGrades: Map<number, string>,
    freeInputValues: Map<number, number>,
    totalCost: number,
    customerInfo?: any,
    estimateId?: number,
    logoType?: 'FL' | 'LS',
    documentType: 'quote' | 'invoice' = 'quote'
): string => {
    const data: PrintData = {
        plan,
        items,
        selectedOptions: Array.from(selectedOptions),
        selectedGrades: Array.from(selectedGrades.entries()),
        freeInputValues: Array.from(freeInputValues.entries()),
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
