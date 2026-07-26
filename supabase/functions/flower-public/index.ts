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
// ================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendMail } from '../_shared/smtp.ts';
import { buildInternalNoticeMail } from '../_shared/mailTemplates.ts';

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

/** 注文受付後の自社通知。失敗しても注文は成立しているため握りつぶす */
const notifyInternal = async (orderId: number) => {
    try {
        const { data: order } = await admin
            .from('flower_orders')
            .select('*, flower_order_items(*), funerals(deceased_name, venue_name, venue_address, ceremony_at)')
            .eq('id', orderId)
            .single();

        const { data: settings } = await admin
            .from('flower_settings').select('*').eq('id', 1).single();

        if (!order || !settings?.mail_from) return;

        const recipients: string[] = settings.notify_emails ?? [];
        if (recipients.length === 0) return;

        const mail = buildInternalNoticeMail(order, order.funerals, order.flower_order_items ?? []);
        await sendMail(recipients, mail.subject, mail.text, settings.mail_from, settings.mail_from_name);

        await admin
            .from('flower_orders')
            .update({ notified_at: new Date().toISOString() })
            .eq('id', orderId);
    } catch (error) {
        console.error('internal notice failed:', error);
    }
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

            if (created) await notifyInternal(created.id);

            return json(data);
        }

        return json({ error: 'invalid_action' }, 400);
    } catch (error) {
        console.error('flower-public failed:', error);
        return json({ error: 'internal_error', detail: String(error) }, 500);
    }
});
