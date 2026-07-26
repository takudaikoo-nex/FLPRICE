// ================================================
// 供花発注システム - メール送信 Edge Function
//
//   POST { type: 'invoice' | 'internal_notice', order_number: string }
//
//   invoice          … お客様（発注者）へ請求書を送る。管理画面から呼び出す（ログイン必須）
//   internal_notice  … 自社へ受注通知を送る。公開サイトから注文直後に呼び出す（認証なし）
//
// 必要なシークレット:
//   SMTP_HOSTNAME / SMTP_PORT / SMTP_USERNAME / SMTP_PASSWORD / SMTP_TLS
//   （SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY は自動で設定されます）
// ================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import {
    buildInvoiceMail, buildInternalNoticeMail, buildPurchaseOrderMail,
} from '../_shared/mailTemplates.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

/** 管理画面からの呼び出しかどうかを検証する */
const isStaff = async (req: Request): Promise<boolean> => {
    const header = req.headers.get('Authorization') ?? '';
    const token = header.replace(/^Bearer\s+/i, '');
    if (!token) return false;

    const { data, error } = await admin.auth.getUser(token);
    return !error && !!data.user;
};

const sendMail = async (
    to: string[],
    subject: string,
    text: string,
    from: string,
    fromName: string,
) => {
    const client = new SMTPClient({
        connection: {
            hostname: env('SMTP_HOSTNAME'),
            port: Number(env('SMTP_PORT') || '587'),
            tls: env('SMTP_TLS') === 'true',
            auth: {
                username: env('SMTP_USERNAME'),
                password: env('SMTP_PASSWORD'),
            },
        },
    });

    try {
        await client.send({
            from: fromName ? `${fromName} <${from}>` : from,
            to,
            subject,
            content: text,
        });
    } finally {
        await client.close();
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
        const { type, order_number, funeral_id, funeral_token } = await req.json();

        if (type !== 'invoice' && type !== 'internal_notice' && type !== 'purchase_order') {
            return json({ error: 'invalid_type' }, 400);
        }

        // 請求書と発注書の送信は、管理画面のログインか、
        // 対象の葬儀の発注トークンを知っていること（＝運用画面からの操作）を条件とする。
        const staff = type === 'internal_notice' ? true : await isStaff(req);

        const { data: settingsRow, error: settingsRowError } = await admin
            .from('flower_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsRowError || !settingsRow) {
            return json({ error: 'settings_not_found' }, 500);
        }
        if (!settingsRow.mail_from) {
            return json({ error: 'mail_from_not_configured' }, 400);
        }

        // ---- 業者への発注書（葬儀単位でまとめて送る）----
        if (type === 'purchase_order') {
            if (!funeral_id) {
                return json({ error: 'funeral_id_required' }, 400);
            }
            if (!settingsRow.supplier_email) {
                return json({ error: 'supplier_email_not_configured' }, 400);
            }

            const { data: funeralRow, error: funeralError } = await admin
                .from('funerals')
                .select('id, deceased_name, venue_name, venue_address, ceremony_at, public_token')
                .eq('id', funeral_id)
                .single();

            if (funeralError || !funeralRow) {
                return json({ error: 'funeral_not_found' }, 404);
            }

            if (!staff && funeralRow.public_token !== funeral_token) {
                return json({ error: 'unauthorized' }, 401);
            }

            const { data: orderRows, error: ordersError } = await admin
                .from('flower_orders')
                .select('*, flower_order_items(*)')
                .eq('funeral_id', funeral_id)
                .neq('order_status', 'cancelled')
                .order('created_at', { ascending: true });

            if (ordersError) {
                return json({ error: 'orders_fetch_failed' }, 500);
            }
            if (!orderRows || orderRows.length === 0) {
                return json({ error: 'no_orders' }, 400);
            }

            const orders = orderRows.map((row: any) => ({ ...row, items: row.flower_order_items ?? [] }));
            const mail = buildPurchaseOrderMail(funeralRow, orders, settingsRow);

            await sendMail(
                [settingsRow.supplier_email],
                mail.subject,
                mail.text,
                settingsRow.mail_from,
                settingsRow.mail_from_name,
            );

            await admin
                .from('funerals')
                .update({ purchase_order_sent_at: new Date().toISOString() })
                .eq('id', funeral_id);

            return json({ sent: true, to: settingsRow.supplier_email, orders: orders.length });
        }

        if (!order_number) {
            return json({ error: 'order_number_required' }, 400);
        }

        // ---- データ取得 ----
        const { data: order, error: orderError } = await admin
            .from('flower_orders')
            .select('*, flower_order_items(*), funerals(deceased_name, venue_name, venue_address, ceremony_at, public_token)')
            .eq('order_number', order_number)
            .single();

        if (orderError || !order) {
            return json({ error: 'order_not_found' }, 404);
        }

        if (type === 'invoice' && !staff && order.funerals?.public_token !== funeral_token) {
            return json({ error: 'unauthorized' }, 401);
        }

        const settings = settingsRow;
        const items = order.flower_order_items ?? [];
        const funeral = order.funerals;

        // ---- 種別ごとの処理 ----
        if (type === 'internal_notice') {
            // 二重送信を防ぐ（公開サイトからの呼び出しのため）
            if (order.notified_at) {
                return json({ skipped: 'already_notified' });
            }

            const recipients: string[] = settings.notify_emails ?? [];
            if (recipients.length === 0) {
                return json({ error: 'notify_emails_not_configured' }, 400);
            }

            const mail = buildInternalNoticeMail(order, funeral, items);
            await sendMail(recipients, mail.subject, mail.text, settings.mail_from, settings.mail_from_name);

            await admin
                .from('flower_orders')
                .update({ notified_at: new Date().toISOString() })
                .eq('id', order.id);

            return json({ sent: true, to: recipients.length });
        }

        const mail = buildInvoiceMail(order, funeral, items, settings);
        await sendMail([order.orderer_email], mail.subject, mail.text, settings.mail_from, settings.mail_from_name);

        await admin
            .from('flower_orders')
            .update({ invoice_sent_at: new Date().toISOString() })
            .eq('id', order.id);

        return json({ sent: true, to: order.orderer_email });
    } catch (error) {
        console.error('send-order-mail failed:', error);
        return json({ error: 'send_failed', detail: String(error) }, 500);
    }
});
