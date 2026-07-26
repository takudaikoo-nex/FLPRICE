import { supabase } from './supabase';

export type EstimateStatus =
    | 'quoted' | 'ordered' | 'completed' | 'invoiced' | 'paid' | 'cancelled';

export const ESTIMATE_STATUS_LABEL: Record<EstimateStatus, string> = {
    quoted: '見積提示',
    ordered: '受注',
    completed: '施行済',
    invoiced: '請求済',
    paid: '入金済',
    cancelled: 'キャンセル',
};

export const ESTIMATE_STATUS_ORDER: EstimateStatus[] = [
    'quoted', 'ordered', 'completed', 'invoiced', 'paid', 'cancelled',
];

/** 帳票の発行でステータスを進める（後戻りはさせない） */
export const statusAfterDocument = (
    current: EstimateStatus,
    documentType: 'quote' | 'invoice' | 'receipt',
): EstimateStatus => {
    if (current === 'cancelled') return current;

    if (documentType === 'invoice') {
        return current === 'paid' ? current : 'invoiced';
    }
    if (documentType === 'receipt') {
        return 'paid';
    }
    return current;
};

export const updateEstimateStatus = async (
    estimateId: number,
    status: EstimateStatus,
): Promise<void> => {
    const { error } = await supabase
        .from('estimates')
        .update({ status })
        .eq('id', estimateId);

    if (error) throw error;
};

export const updateEstimateNote = async (
    estimateId: number,
    note: string,
): Promise<void> => {
    const { error } = await supabase
        .from('estimates')
        .update({ note })
        .eq('id', estimateId);

    if (error) throw error;
};
