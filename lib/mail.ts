import { supabase } from './supabase';

export type OrderMailType = 'invoice' | 'internal_notice' | 'purchase_order';

interface SendOrderMailArgs {
    /** invoice / internal_notice で必要 */
    orderNumber?: string;
    /** purchase_order で必要（葬儀単位でまとめて送る） */
    funeralId?: string;
    /**
     * 対象の葬儀の発注トークン。
     * ログインのないユーザー画面から送信する際の本人確認に使う（管理画面からはログインで判定）。
     */
    funeralToken?: string;
}

/**
 * メール送信 Edge Function（send-order-mail）を呼び出す。
 *
 * - invoice         : お客様へ請求書。管理画面から（ログイン必須）
 * - purchase_order  : 業者へ発注書。管理画面から、葬儀単位でまとめて（ログイン必須）
 * - internal_notice : 自社へ受注通知。公開サイトから注文直後に（認証不要・二重送信は関数側で防止）
 */
export const sendOrderMail = async (type: OrderMailType, args: SendOrderMailArgs | string) => {
    const normalized: SendOrderMailArgs = typeof args === 'string' ? { orderNumber: args } : args;

    const { data, error } = await supabase.functions.invoke('send-order-mail', {
        body: {
            type,
            order_number: normalized.orderNumber,
            funeral_id: normalized.funeralId,
            funeral_token: normalized.funeralToken,
        },
    });

    if (error) {
        // supabase-js は関数が返したエラー本文を message に載せないため、
        // レスポンスから実際のエラーコードを取り出す
        let code = '';
        const response = (error as { context?: Response }).context;
        if (response && typeof response.json === 'function') {
            try {
                const body = await response.json();
                code = body?.error || '';
                // send_failed / internal_error は種別だけで原因が分からないため、
                // 関数が返した詳細（SMTPサーバーの応答など）をそのまま使う
                if ((code === 'send_failed' || code === 'internal_error') && body?.detail) {
                    code = body.detail;
                }
            } catch {
                // 本文が読めない場合は元のメッセージを使う
            }
        }
        throw new Error(code || error.message);
    }

    if (data?.error) throw new Error(data.error);
    return data as { sent?: boolean; skipped?: string; orders?: number };
};
