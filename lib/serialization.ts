import { Plan, Item } from '../types';

export interface PrintData {
    plan: Plan;
    items: Item[];
    optionValues: [number, number][]; // serialized Map
    totalCost: number;
    customerInfo?: any;
    estimateId?: number;
    logoType?: 'FL' | 'LS';
    documentType?: 'quote' | 'invoice';
}

export const serializePrintData = (
    plan: Plan,
    items: Item[],
    optionValues: Map<number, number>,
    totalCost: number,
    customerInfo?: any,
    estimateId?: number,
    logoType?: 'FL' | 'LS',
    documentType: 'quote' | 'invoice' = 'quote'
): string => {
    const data: PrintData = {
        plan,
        items,
        optionValues: Array.from(optionValues.entries()),
        totalCost,
        customerInfo,
        estimateId,
        logoType,
        documentType
    };
    return JSON.stringify(data);
};

export const deserializePrintData = (json: string): {
    plan: Plan;
    items: Item[];
    optionValues: Map<number, number>;
    totalCost: number;
    customerInfo?: any;
    estimateId?: number;
    logoType?: 'FL' | 'LS';
    documentType?: 'quote' | 'invoice';
} | null => {
    try {
        const data: PrintData = JSON.parse(json);
        return {
            plan: data.plan,
            items: data.items,
            optionValues: new Map(data.optionValues),
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
