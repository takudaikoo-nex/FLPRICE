// ================================================
// Stripe Webhook（供花のカード決済）
//
//   Stripe から直接呼ばれるため認証は付かない（verify_jwt = false）。
//   代わりに署名（Stripe-Signature）を必ず検証し、
//   検証に通らないリクエストは一切処理しない。
//
//   受け取るイベント:
//     payment_intent.succeeded       … 入金確定。メールを送る
//     payment_intent.payment_failed  … 決済失敗
//     charge.refunded                … 返金
// ================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0?target=denonext';
import { sendOrderMails } from '../_shared/orderMails.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

const admin = createClient(
    env('SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
);

const stripe = new Stripe(env('STRIPE_SECRET_KEY'), { apiVersion: '2025-08-27.basil' });

/** 決済IDから注文を引く。metadata の order_id は補助として使う */
const findOrder = async (paymentIntentId: string, orderId?: string) => {
    const { data } = await admin
        .from('flower_orders')
        .select('id, payment_status')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle();

    if (data) return data;
    if (!orderId) return null;

    const { data: byId } = await admin
        .from('flower_orders')
        .select('id, payment_status')
        .eq('id', Number(orderId))
        .maybeSingle();

    return byId ?? null;
};

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response('method_not_allowed', { status: 405 });
    }

    const signature = req.headers.get('Stripe-Signature');
    const secret = env('STRIPE_WEBHOOK_SECRET');

    if (!signature || !secret) {
        console.error('webhook rejected: signature or secret missing');
        return new Response('bad_request', { status: 400 });
    }

    // 署名の検証には生のボディが要るので、JSON にする前に文字列で受け取る
    const raw = await req.text();

    let event: Stripe.Event;
    try {
        // Deno では同期版が使えないため非同期版で検証する
        event = await stripe.webhooks.constructEventAsync(raw, signature, secret);
    } catch (error) {
        console.error('webhook signature verification failed:', error);
        return new Response('invalid_signature', { status: 400 });
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const intent = event.data.object as Stripe.PaymentIntent;
            const order = await findOrder(intent.id, intent.metadata?.order_id);

            if (!order) {
                console.error('order not found for payment intent', intent.id);
                return new Response('ok', { status: 200 });
            }

            // 同じイベントが再送されても二重にメールを送らない
            if (order.payment_status === 'paid') {
                return new Response('ok', { status: 200 });
            }

            await admin
                .from('flower_orders')
                .update({
                    payment_status: 'paid',
                    paid_at: new Date().toISOString(),
                    stripe_payment_intent_id: intent.id,
                })
                .eq('id', order.id);

            await sendOrderMails(admin, order.id);
        }

        if (event.type === 'payment_intent.payment_failed') {
            const intent = event.data.object as Stripe.PaymentIntent;
            const order = await findOrder(intent.id, intent.metadata?.order_id);

            if (order && order.payment_status !== 'paid') {
                await admin
                    .from('flower_orders')
                    .update({ payment_status: 'failed' })
                    .eq('id', order.id);
            }
        }

        if (event.type === 'charge.refunded') {
            const charge = event.data.object as Stripe.Charge;
            const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;

            if (intentId) {
                const order = await findOrder(intentId);
                if (order) {
                    await admin
                        .from('flower_orders')
                        .update({ payment_status: 'refunded' })
                        .eq('id', order.id);
                }
            }
        }

        return new Response('ok', { status: 200 });
    } catch (error) {
        // 200 以外を返すと Stripe が再送してくれる
        console.error('webhook handling failed:', error);
        return new Response('internal_error', { status: 500 });
    }
});
