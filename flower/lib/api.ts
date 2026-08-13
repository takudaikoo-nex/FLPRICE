// ================================================
// 供花 公開サイトの API クライアント
//
// このサイトには Supabase の鍵を持たせない。
// DBへのアクセスはすべて Edge Function（flower-public）が行い、
// ここからは認証情報なしの fetch で呼び出す。
// ================================================

const FUNCTION_URL = 'https://kbifluukpqhbjmhhvbgg.supabase.co/functions/v1/flower-public';

export type FuneralStatus = 'open' | 'closed' | 'deadline_passed' | 'not_found';

export interface FuneralPublic {
    status: FuneralStatus;
    deceased_name: string;
    chief_mourner_name: string;
    venue_name: string;
    venue_address: string;
    wake_at: string | null;
    ceremony_at: string | null;
    order_deadline: string | null;
    discount_type: 'none' | 'amount' | 'percent';
    discount_value: number;
    discount_note: string;
    tax_rate: number;
    card_payment_enabled: boolean;
}

export interface PublicProduct {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    price: number; // 税抜
    /** そのまま <img src> に使える絶対URL */
    image_paths: string[];
}

export interface CartLine {
    product: PublicProduct;
    quantity: number;
    nafuda_name: string;
}

export interface OrdererInput {
    name: string;
    kana: string;
    company: string;
    phone: string;
    email: string;
    postal_code: string;
    address: string;
    relation: string;
    remarks: string;
}

export interface OrderResult {
    order_number: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    /** カード払いのときだけ返る。ブラウザでのカード入力に使う */
    client_secret?: string;
    /** カード払いのときだけ返る Stripe の公開可能キー */
    publishable_key?: string;
}

export interface CompanyInfo {
    company_name: string;
    company_postal_code: string;
    company_address: string;
    company_tel: string;
    representative_name: string;
    contact_tel: string;
    contact_hours: string;
    cancellation_policy: string;
    privacy_note: string;
    mail_from: string;
    payment_due_days: number;
    card_payment_enabled: boolean;
    tax_rate: number;
}

/** 発注URLに設定された割引額（税抜の小計に対して適用） */
export const calcDiscount = (subtotal: number, funeral: FuneralPublic): number => {
    if (funeral.discount_type === 'amount') {
        return Math.min(funeral.discount_value, subtotal);
    }
    if (funeral.discount_type === 'percent') {
        return Math.min(Math.round(subtotal * funeral.discount_value / 100), subtotal);
    }
    return 0;
};

/** URL（/order/<token> もしくは ?t=<token>）から発注トークンを取り出す */
export const readTokenFromUrl = (): string | null => {
    const fromQuery = new URLSearchParams(window.location.search).get('t');
    if (fromQuery) return fromQuery;

    const match = window.location.pathname.match(/\/order\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
};

class ApiError extends Error {
    constructor(message: string, readonly detail: string = '') {
        super(message);
    }
}

const callApi = async <T>(body: Record<string, unknown>): Promise<T> => {
    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.error) {
        throw new ApiError(data?.error || `HTTP ${response.status}`, data?.detail || '');
    }
    return data as T;
};

export const lookupFuneral = (token: string): Promise<FuneralPublic> =>
    callApi<FuneralPublic>({ action: 'lookup', token });

export const fetchProducts = (): Promise<PublicProduct[]> =>
    callApi<PublicProduct[]>({ action: 'products' });

export const fetchCompany = (): Promise<CompanyInfo> =>
    callApi<CompanyInfo>({ action: 'company' });

/** 表示に使う問い合わせ電話番号 */
export const contactTel = (company: CompanyInfo | null): string =>
    company?.contact_tel || company?.company_tel || '';

export const submitOrder = (
    token: string,
    orderer: OrdererInput,
    lines: CartLine[],
    paymentMethod: 'card' | 'invoice',
): Promise<OrderResult> =>
    callApi<OrderResult>({
        action: 'create_order',
        token,
        orderer,
        items: lines.map(line => ({
            product_id: line.product.id,
            quantity: line.quantity,
            nafuda_name: line.nafuda_name,
        })),
        payment_method: paymentMethod,
    });

const ERROR_MESSAGES: Record<string, string> = {
    INVALID_TOKEN: 'この発注ページのURLが正しくありません。お手数ですが葬儀社までご連絡ください。',
    ORDER_CLOSED: '申し訳ありません。この葬儀の供花受付は終了しました。',
    DEADLINE_PASSED: '申し訳ありません。受付締切を過ぎたため、お申し込みいただけません。',
    CARD_DISABLED: '現在クレジットカード決済はご利用いただけません。請求書でのお支払いをお選びください。',
    payment_setup_failed: '決済の準備に失敗しました。恐れ入りますが、請求書でのお支払いをお選びいただくか、下記までご連絡ください。',
    INVALID_PAYMENT_METHOD: 'お支払い方法をお選びください。',
    INVALID_ORDERER: 'お名前・電話番号・メールアドレスをご入力ください。',
    EMPTY_ITEMS: 'お供物が選択されていません。',
    INVALID_QUANTITY: 'ご注文数が正しくありません。',
    PRODUCT_NOT_FOUND: '選択されたお供物が現在取り扱えません。お手数ですが選び直してください。',
};

/** エラーを利用者向けの文面に変換する */
export const toUserMessage = (error: unknown): string => {
    const raw = [
        (error as { message?: string })?.message,
        (error as { detail?: string })?.detail,
    ].filter(Boolean).join(' ');

    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
        if (raw.includes(code)) return message;
    }
    return '送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。';
};
