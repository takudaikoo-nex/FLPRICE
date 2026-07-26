import { supabase } from './supabase';
import { Customer } from '../types';

export type CustomerInput = Omit<Customer, 'id' | 'customer_no' | 'created_at'>;

export const emptyCustomerInput = (): CustomerInput => ({
    name: '',
    kana: '',
    phone: '',
    postal_code: '',
    address: '',
    note: '',
});

export const fetchCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

/** 顧客の「箱」だけを作る */
export const createCustomer = async (input: CustomerInput): Promise<Customer> => {
    const { data, error } = await supabase
        .from('customers')
        .insert([{ ...input, name: input.name.trim() }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateCustomer = async (id: string, input: CustomerInput): Promise<void> => {
    const { error } = await supabase
        .from('customers')
        .update({ ...input, name: input.name.trim() })
        .eq('id', id);

    if (error) throw error;
};

/** 見積が紐づいている顧客は削除できない（DB側で customer_id が NULL になるため事前に確認する） */
export const deleteCustomer = async (id: string): Promise<void> => {
    const { count, error: countError } = await supabase
        .from('estimates')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id);

    if (countError) throw countError;
    if ((count ?? 0) > 0) {
        throw new Error(`この顧客には見積が ${count} 件紐づいているため削除できません`);
    }

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
};

/** 見積を顧客に紐付ける（宙ぶらりんの見積の割り当て・付け替えの両方に使う） */
export const linkEstimateToCustomer = async (
    estimateId: number,
    customerId: string | null,
): Promise<void> => {
    const { error } = await supabase
        .from('estimates')
        .update({ customer_id: customerId })
        .eq('id', estimateId);

    if (error) throw error;
};

/**
 * 見積の顧客情報から顧客名を決める（申込者 → 喪主 → 故人）。
 * いずれも空なら null を返し、その見積は未紐付けのままにする。
 */
export const deriveCustomerNameFromInfo = (info: any): string | null => {
    const found = [info?.applicantName, info?.chiefMournerName, info?.deceasedName]
        .find(name => typeof name === 'string' && name.trim().length > 0);
    return found ? found.trim() : null;
};

/**
 * 見積の保存時に顧客を用意する。
 * 同名の顧客がいれば再利用し（電話番号が一致するものを優先）、いなければ新規作成する。
 */
export const findOrCreateCustomerForEstimate = async (info: any): Promise<string | null> => {
    const name = deriveCustomerNameFromInfo(info);
    if (!name) return null;

    const phone = (info?.applicantPhone || info?.chiefMournerPhone || info?.chiefMournerMobile || '').trim();

    const { data: matches, error } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('name', name);

    if (error) throw error;

    if (matches && matches.length > 0) {
        const samePhone = phone ? matches.find(c => c.phone === phone) : null;
        return (samePhone ?? matches[0]).id;
    }

    const created = await createCustomer({
        name,
        kana: '',
        phone,
        postal_code: (info?.applicantPostalCode || '').trim(),
        address: (info?.applicantAddress || info?.chiefMournerAddress || '').trim(),
        note: '',
    });

    return created.id;
};

/** 見積が持つ顧客情報の部分更新。呼び出し時に使う content 側も揃えて更新する */
export const updateEstimateCustomerInfo = async (
    estimateId: number,
    patch: Record<string, string>,
): Promise<void> => {
    const { data, error } = await supabase
        .from('estimates')
        .select('content, customer_info')
        .eq('id', estimateId)
        .single();

    if (error) throw error;

    const customerInfo = { ...(data.customer_info || {}), ...patch };
    const content = { ...(data.content || {}) };
    if (content.customerInfo) {
        content.customerInfo = { ...content.customerInfo, ...patch };
    } else {
        content.customerInfo = customerInfo;
    }

    const { error: updateError } = await supabase
        .from('estimates')
        .update({ content, customer_info: customerInfo })
        .eq('id', estimateId);

    if (updateError) throw updateError;
};
