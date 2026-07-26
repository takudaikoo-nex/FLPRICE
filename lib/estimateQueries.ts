import { supabase } from './supabase';

export interface EstimateSummary {
    id: number;
    createdAt: string;
    totalPrice: number;
    /** 紐づく顧客。未紐付けの見積は null */
    customerId: string | null;
    /** 表示用の顧客名。紐付けがあれば顧客レコード、無ければ customer_info から導出 */
    customerName: string;
    deceasedName: string;
    applicantName: string;
    chiefMournerName: string;
    phone: string;
    /** 葬儀日（見積の入力値。'YYYY-MM-DD' など） */
    funeralDate: string;
}

const UNKNOWN_CUSTOMER = '（顧客情報なし）';

/**
 * 顧客名の決定ルール（申込者 → 喪主 → 故人 の順）。
 * 顧客レコードに紐付いていない見積の表示に使う。
 */
const deriveCustomerName = (info: any): string => {
    const candidates = [info?.applicantName, info?.chiefMournerName, info?.deceasedName];
    const found = candidates.find(name => typeof name === 'string' && name.trim().length > 0);
    return found ? found.trim() : UNKNOWN_CUSTOMER;
};

export const fetchEstimateSummaries = async (limit = 500): Promise<EstimateSummary[]> => {
    const { data, error } = await supabase
        .from('estimates')
        .select('id, created_at, customer_info, total_price, customer_id, customers(name)')
        .order('id', { ascending: false })
        .limit(limit);

    if (error) throw error;

    return (data || []).map((row: any) => {
        const info = row.customer_info || {};
        return {
            id: row.id,
            createdAt: row.created_at,
            totalPrice: row.total_price ?? 0,
            customerId: row.customer_id ?? null,
            customerName: row.customers?.name || deriveCustomerName(info),
            deceasedName: info.deceasedName || '',
            applicantName: info.applicantName || '',
            chiefMournerName: info.chiefMournerName || '',
            phone: info.applicantPhone || info.chiefMournerPhone || info.chiefMournerMobile || '',
            funeralDate: info.funeralDate || '',
        };
    });
};

/**
 * 見積の葬儀日を告別式の日時（ISO文字列）に変換する。
 * 見積側は日付のみのため、時刻は既定値を当てる（管理画面で調整可能）。
 */
export const funeralDateToCeremonyIso = (funeralDate: string, defaultHour = 10): string | null => {
    if (!funeralDate) return null;

    const ymd = funeralDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
        const [, y, m, d] = ymd;
        return new Date(Number(y), Number(m) - 1, Number(d), defaultHour, 0, 0).toISOString();
    }

    const parsed = new Date(funeralDate);
    if (isNaN(parsed.getTime())) return null;
    parsed.setHours(defaultHour, 0, 0, 0);
    return parsed.toISOString();
};

/** 見積の検索（見積番号・故人名・申込者名・喪主名・電話番号） */
export const matchesKeyword = (estimate: EstimateSummary, keyword: string): boolean => {
    const q = keyword.trim().toLowerCase();
    if (!q) return true;

    return [
        String(estimate.id),
        estimate.customerName,
        estimate.deceasedName,
        estimate.applicantName,
        estimate.chiefMournerName,
        estimate.phone,
    ].some(value => value.toLowerCase().includes(q));
};

export const formatDate = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
};
