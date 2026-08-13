// ================================================
// 注文received後のメール送信
//
//   請求書払い … 注文が入った時点（flower-public）
//   カード払い … 決済が完了した時点（stripe-webhook）
// どちらも自社への受注通知とお客様宛の書面を送る。
// ================================================

import { sendMail } from './smtp.ts';
import { buildInternalNoticeMail, buildInvoiceMail, buildCardReceiptMail } from './mailTemplates.ts';

/**
 * 注文1件分のメールを送る。
 * どのメールも失敗しうるが、注文・決済自体は成立しているため
 * ログに残して続行し、例外は投げない。
 */
export const sendOrderMails = async (admin: any, orderId: number) => {
    try {
        const { data: order } = await admin
            .from('flower_orders')
            .select('*, flower_order_items(*), funerals(deceased_name, venue_name, venue_address, ceremony_at)')
            .eq('id', orderId)
            .single();

        const { data: settings } = await admin
            .from('flower_settings').select('*').eq('id', 1).single();

        if (!order) {
            console.error('order mails skipped: order not found', orderId);
            return;
        }
        if (!settings?.mail_from) {
            console.error('order mails skipped: mail_from is not configured in flower_settings');
            return;
        }

        const items = order.flower_order_items ?? [];

        // ---- 自社への受注通知 ----
        const recipients: string[] = settings.notify_emails ?? [];
        if (recipients.length === 0) {
            console.error('internal notice skipped: notify_emails is empty in flower_settings');
        } else {
            try {
                const notice = buildInternalNoticeMail(order, order.funerals, items);
                await sendMail(recipients, notice.subject, notice.text, settings.mail_from, settings.mail_from_name);
                await admin
                    .from('flower_orders')
                    .update({ notified_at: new Date().toISOString() })
                    .eq('id', orderId);
            } catch (error) {
                console.error('internal notice failed:', error);
            }
        }

        // ---- お客様への書面 ----
        try {
            const mail = order.payment_method === 'card'
                ? buildCardReceiptMail(order, order.funerals, items, settings)
                : buildInvoiceMail(order, order.funerals, items, settings);

            await sendMail(
                [order.orderer_email],
                mail.subject,
                mail.text,
                settings.mail_from,
                settings.mail_from_name,
            );

            // 請求書は「送った日」を支払期限の起点として管理画面で使うため記録する。
            // カード払いは決済済みなので paid_at 側で追う。
            if (order.payment_method === 'invoice') {
                await admin
                    .from('flower_orders')
                    .update({ invoice_sent_at: new Date().toISOString() })
                    .eq('id', orderId);
            }
        } catch (error) {
            console.error('customer mail failed:', error);
        }
    } catch (error) {
        console.error('order mails failed:', error);
    }
};
