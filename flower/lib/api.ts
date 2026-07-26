import { supabase } from '../../lib/supabase';

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
    tax: number;
    total: number;
}

/** URL（/order/<token> もしくは ?t=<token>）から発注トークンを取り出す */
export const readTokenFromUrl = (): string | null => {
    const fromQuery = new URLSearchParams(window.location.search).get('t');
    if (fromQuery) return fromQuery;

    const match = window.location.pathname.match(/\/order\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
};

export const lookupFuneral = async (token: string): Promise<FuneralPublic> => {
    const { data, error } = await supabase.rpc('funeral_public_lookup', { p_token: token });
    if (error) throw error;
    return data as FuneralPublic;
};

export const fetchProducts = async (): Promise<PublicProduct[]> => {
    const { data, error } = await supabase
        .from('flower_products')
        .select('id, code, name, description, category, price, image_paths')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
};

const ERROR_MESSAGES: Record<string, string> = {
    INVALID_TOKEN: 'この発注ページのURLが正しくありません。お手数ですが葬儀社までご連絡ください。',
    ORDER_CLOSED: '申し訳ありません。この葬儀の供花受付は終了しました。',
    DEADLINE_PASSED: '申し訳ありません。受付締切を過ぎたため、お申し込みいただけません。',
    CARD_DISABLED: '現在クレジットカード決済はご利用いただけません。請求書でのお支払いをお選びください。',
    INVALID_PAYMENT_METHOD: 'お支払い方法をお選びください。',
    INVALID_ORDERER: 'お名前・電話番号・メールアドレスをご入力ください。',
    EMPTY_ITEMS: 'お供物が選択されていません。',
    INVALID_QUANTITY: 'ご注文数が正しくありません。',
    PRODUCT_NOT_FOUND: '選択されたお供物が現在取り扱えません。お手数ですが選び直してください。',
};

/** RPCのエラーメッセージを利用者向けの文面に変換する */
export const toUserMessage = (error: unknown): string => {
    const raw = (error as { message?: string })?.message || '';
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
        if (raw.includes(code)) return message;
    }
    return '送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。';
};

export const submitOrder = async (
    token: string,
    orderer: OrdererInput,
    lines: CartLine[],
    paymentMethod: 'card' | 'invoice',
): Promise<OrderResult> => {
    const { data, error } = await supabase.rpc('create_flower_order', {
        p_token: token,
        p_orderer: orderer,
        p_items: lines.map(line => ({
            product_id: line.product.id,
            quantity: line.quantity,
            nafuda_name: line.nafuda_name,
        })),
        p_payment_method: paymentMethod,
    });

    if (error) throw error;
    return data as OrderResult;
};
