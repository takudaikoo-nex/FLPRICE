// ================================================
// 供花 公開サイト用 API
//
//   公開サイトに Supabase の鍵を持たせないための入口。
//   ブラウザからは認証情報なしの fetch で呼び出し、
//   DBへのアクセスはこの関数の中（service role）だけで行う。
//
//   POST { action: 'lookup',       token }
//   POST { action: 'products' }
//   POST { action: 'create_order', token, orderer, items, payment_method }
//   POST { action: 'company' }      … 特商法・プライバシーポリシー用の事業者情報
//
//   カード払いの場合は注文の作成に続けて Stripe の PaymentIntent を用意し、
//   ブラウザでカード入力に使う client_secret を返す。
//   入金の確定とメール送信は stripe-webhook 側で行う。
// ================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0?target=denonext';
import { sendOrderMails } from '../_shared/orderMails.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

const env = (key: string): string => Deno.env.get(key) ?? '';

const admin = createClient(
    env('SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
);

const IMAGE_BASE = `${env('SUPABASE_URL')}/storage/v1/object/public/flower-images/`;

const imageUrl = (path: string): string =>
    /^(https?:|data:|\/)/.test(path) ? path : IMAGE_BASE + path;

const stripeSecretKey = env('STRIPE_SECRET_KEY');
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' }) : null;

/**
 * カード決済の準備。
 *
 * 金額はブラウザから受け取らず、DBに保存済みの合計（税込）だけを使う。
 * 作成した PaymentIntent は注文に紐づけ、入金の確定は Webhook 側で行う。
 */
const prepareCardPayment = async (orderId: number, orderNumber: string) => {
    if (!stripe) throw new Error('STRIPE_SECRET_KEY is not configured');

    const { data: order, error } = await admin
        .from('flower_orders')
        .select('total, orderer_name, orderer_email, funeral_id')
        .eq('id', orderId)
        .single();

    if (error || !order) throw new Error('order not found');
    if (!order.total || order.total < 50) throw new Error('invalid amount');

    const intent = await stripe.paymentIntents.create({
        amount: order.total, // 円は最小単位がそのまま円
        currency: 'jpy',
        // カードだけに絞る。コンビニ等の遷移が必要な決済手段が混ざると
        // 画面遷移の後始末が要るうえ、供花の締切に間に合わないため。
        payment_method_types: ['card'],
        description: `供花 ${orderNumber}`,
        receipt_email: order.orderer_email,
        metadata: {
            order_id: String(orderId),
            order_number: orderNumber,
            funeral_id: order.funeral_id ?? '',
        },
    });

    await admin
        .from('flower_orders')
        .update({ stripe_payment_intent_id: intent.id })
        .eq('id', orderId);

    return intent.client_secret;
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405);
    }

    try {
        const body = await req.json();
        const action = body?.action;

        // ---- 葬儀情報（トークンを知っている場合のみ）----
        if (action === 'lookup') {
            if (!body.token) return json({ error: 'token_required' }, 400);

            const { data, error } = await admin.rpc('funeral_public_lookup', { p_token: body.token });
            if (error) throw error;
            return json(data);
        }

        // ---- 公開中の商品一覧 ----
        if (action === 'products') {
            const { data, error } = await admin
                .from('flower_products')
                .select('id, code, name, description, category, price, image_paths')
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) throw error;

            return json((data ?? []).map(product => ({
                ...product,
                image_paths: (product.image_paths ?? []).map(imageUrl),
            })));
        }

        // ---- 事業者情報（特商法・プライバシーポリシー・フッター用）----
        if (action === 'company') {
            const { data, error } = await admin
                .from('flower_settings')
                .select('company_name, company_postal_code, company_address, company_tel, '
                    + 'representative_name, contact_tel, contact_hours, cancellation_policy, '
                    + 'privacy_note, mail_from, payment_due_days, card_payment_enabled, tax_rate')
                .eq('id', 1)
                .single();

            if (error) throw error;
            return json(data);
        }

        // ---- 注文の作成 ----
        if (action === 'create_order') {
            const { data, error } = await admin.rpc('create_flower_order', {
                p_token: body.token,
                p_orderer: body.orderer,
                p_items: body.items,
                p_payment_method: body.payment_method,
            });

            if (error) {
                // 業務エラー（締切超過など）は利用者向けに識別できる形で返す
                return json({ error: 'order_failed', detail: error.message }, 400);
            }

            const { data: created } = await admin
                .from('flower_orders')
                .select('id')
                .eq('order_number', data.order_number)
                .single();

            // カード払いはここではメールを送らない。
            // 決済が完了した時点で Webhook から送る。
            if (body.payment_method === 'card') {
                if (!created) return json({ error: 'internal_error', detail: 'order not found' }, 500);
                try {
                    const clientSecret = await prepareCardPayment(created.id, data.order_number);
                    return json({
                        ...data,
                        client_secret: clientSecret,
                        publishable_key: env('STRIPE_PUBLISHABLE_KEY'),
                    });
                } catch (error) {
                    console.error('payment intent failed:', error);
                    // 注文自体は残る。お客様には請求書払いへの切り替えを案内する
                    return json({ error: 'payment_setup_failed', detail: String(error) }, 502);
                }
            }

            if (created) await sendOrderMails(admin, created.id);

            return json(data);
        }

        return json({ error: 'invalid_action' }, 400);
    } catch (error) {
        console.error('flower-public failed:', error);
        return json({ error: 'internal_error', detail: String(error) }, 500);
    }
});
