// ================================================
// メール本文の組み立て
//
// このファイルは Edge Function（Deno）と管理画面（Vite）の両方から読み込みます。
// そのため Deno / Node / ブラウザ固有のAPIは使わないでください。
// ================================================

export interface MailOrderItem {
    product_code: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    nafuda_name: string;
}

export interface MailOrder {
    order_number: string;
    orderer_name: string;
    orderer_company: string;
    orderer_email: string;
    orderer_phone: string;
    orderer_postal_code: string;
    orderer_address: string;
    payment_method: 'card' | 'invoice';
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    remarks: string;
    created_at: string;
}

export interface MailFuneral {
    deceased_name: string;
    venue_name: string;
    venue_address: string;
    ceremony_at: string | null;
    /** 設営期日。未設定なら「告別式の開始まで」と案内する */
    setup_deadline?: string | null;
}

/** 発注書の対象となる、葬儀にぶら下がる注文1件 */
export interface MailOrderWithItems extends MailOrder {
    items: MailOrderItem[];
    order_status?: string;
    payment_status?: string;
    /** 発注書に含めるかの手動指定。null/undefined なら状態から自動で判定する */
    include_in_purchase_order?: boolean | null;
}

/**
 * その注文を業者への発注書に載せるか。
 *
 * 手動指定があればそれに従い、無ければキャンセル済みを除外する。
 * 管理画面のプレビューと Edge Function で同じ判定を使うため、ここに置いている。
 */
export const isPurchaseOrderTarget = (order: {
    order_status?: string;
    payment_status?: string;
    include_in_purchase_order?: boolean | null;
}): boolean => {
    if (typeof order.include_in_purchase_order === 'boolean') return order.include_in_purchase_order;
    return order.order_status !== 'cancelled' && order.payment_status !== 'cancelled';
};

export interface MailSettings {
    company_name: string;
    company_postal_code: string;
    company_address: string;
    company_tel: string;
    invoice_registration_number: string;
    bank_info: string;
    payment_due_days: number;
}

export interface BuiltMail {
    subject: string;
    text: string;
}

const yen = (value: number): string => `¥${value.toLocaleString('ja-JP')}`;

/**
 * 日本時間（+09:00）で日付を組み立てる。
 *
 * Edge Function は UTC で動くため、getHours() などをそのまま使うと
 * 9時間ずれた時刻が表示される。日本に時差変更（サマータイム）は無いので、
 * 固定で9時間足したうえで UTC 系のメソッドを使う。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const toJst = (iso: string | null): Date | null => {
    if (!iso) return null;
    const date = new Date(iso);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getTime() + JST_OFFSET_MS);
};

const dateOnly = (iso: string | null): string => {
    const d = toJst(iso);
    if (!d) return '—';
    return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
};

const dateTime = (iso: string | null): string => {
    const d = toJst(iso);
    if (!d) return '—';
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

/** 件名用の短い日付（2026-08-02）。「年月日」は1文字9文字分に膨らむため使わない */
const dateCompact = (iso: string | null): string => {
    const d = toJst(iso);
    if (!d) return '';
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

const addDays = (iso: string, days: number): string => {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return dateOnly(new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString());
};

const itemLines = (items: MailOrderItem[]): string =>
    items.map(item => [
        `  ・${item.product_name}（${item.product_code}）`,
        `      数量: ${item.quantity}　金額: ${yen(item.unit_price * item.quantity)}`,
        `      名札: ${item.nafuda_name || '（記載なし）'}`,
    ].join('\n')).join('\n');

const ordererBlock = (order: MailOrder): string => [
    order.orderer_company ? `  会社名・団体名: ${order.orderer_company}` : '',
    `  お名前: ${order.orderer_name} 様`,
    `  電話番号: ${order.orderer_phone}`,
    `  メール: ${order.orderer_email}`,
    order.orderer_address
        ? `  ご住所: ${order.orderer_postal_code ? `〒${order.orderer_postal_code} ` : ''}${order.orderer_address}`
        : '',
].filter(Boolean).join('\n');

/** お客様（発注者）宛の請求書メール */
export const buildInvoiceMail = (
    order: MailOrder,
    funeral: MailFuneral,
    items: MailOrderItem[],
    settings: MailSettings,
): BuiltMail => {
    const to = order.orderer_company
        ? `${order.orderer_company}\n${order.orderer_name} 様`
        : `${order.orderer_name} 様`;

    const text = `${to}

このたびは供花のお申し込みを賜り、誠にありがとうございました。
下記のとおりご請求申し上げます。

───────────────
■ ご注文内容
───────────────
  注文番号: ${order.order_number}
  お申し込み日: ${dateOnly(order.created_at)}

  お届け先: 故 ${funeral.deceased_name} 様
  式場: ${funeral.venue_name || '—'}
${funeral.venue_address ? `  住所: ${funeral.venue_address}\n` : ''}  告別式: ${dateTime(funeral.ceremony_at)}

${itemLines(items)}

───────────────
■ ご請求金額
───────────────
  小計（税抜）: ${yen(order.subtotal)}
${order.discount > 0 ? `  割引:         -${yen(order.discount)}
` : ''}  消費税:       ${yen(order.tax)}
  ご請求額:     ${yen(order.total)}（税込）

  お支払期限: ${addDays(order.created_at, settings.payment_due_days)}

───────────────
■ お振込先
───────────────
${settings.bank_info || '  （別途ご連絡いたします）'}

  ※ 恐れ入りますが、振込手数料はお客様のご負担にてお願いいたします。

───────────────
${settings.company_name}
${settings.company_postal_code ? `〒${settings.company_postal_code} ` : ''}${settings.company_address}
TEL: ${settings.company_tel}
${settings.invoice_registration_number ? `登録番号: ${settings.invoice_registration_number}` : ''}
───────────────

末筆ながら、心よりお悔やみ申し上げます。
`;

    return {
        // 件名はエンコード後74文字までで、日本語1文字が9文字に膨らむ。
        // 注文番号は本文の冒頭に記載しているため件名からは省いている。
        subject: '供花代金のご請求',
        text,
    };
};

/**
 * 業者宛の発注書メール。
 * 葬儀（＝故人）単位で、その葬儀に入った全注文を1通にまとめる。
 */
export const buildPurchaseOrderMail = (
    funeral: MailFuneral,
    orders: MailOrderWithItems[],
    settings: MailSettings & { supplier_name: string },
): BuiltMail => {
    // キャンセル済み（または手動で外した）注文は載せない
    const allItems = orders.filter(isPurchaseOrderTarget).flatMap(order => order.items);

    // 商品ごとの本数を集計
    const totals = new Map<string, { name: string; code: string; quantity: number }>();
    for (const item of allItems) {
        const current = totals.get(item.product_code);
        if (current) current.quantity += item.quantity;
        else totals.set(item.product_code, {
            name: item.product_name,
            code: item.product_code,
            quantity: item.quantity,
        });
    }

    const summary = Array.from(totals.values())
        .map(t => `  ・${t.name}（${t.code}）　　${t.quantity} 基`)
        .join('\n');

    // 名札の一覧（設営順に使えるよう注文順に並べる）
    // 商品名はどれも「供花」で区別がつかないため、商品コードを併記する。
    let index = 0;
    const nafudaList = allItems.map(item => {
        const label = item.product_code ? `${item.product_name}（${item.product_code}）` : item.product_name;
        const lines: string[] = [];
        for (let i = 0; i < item.quantity; i++) {
            index += 1;
            lines.push(`  ${String(index).padStart(2, '0')}. ${label}　／　名札: ${item.nafuda_name || '（記載なし）'}`);
        }
        return lines.join('\n');
    }).join('\n');

    const totalCount = allItems.reduce((sum, item) => sum + item.quantity, 0);

    const setupNote = funeral.setup_deadline
        ? `  ※ ${dateTime(funeral.setup_deadline)} までに設営をお願いいたします。`
        : '  ※ 告別式の開始までに設営をお願いいたします。';

    const text = `${settings.supplier_name ? `${settings.supplier_name} 御中` : '御中'}

いつもお世話になっております。${settings.company_name}です。
下記のとおり供花の手配をお願いいたします。

───────────────
■ お届け先
───────────────
  故 ${funeral.deceased_name} 様
  式場: ${funeral.venue_name || '—'}
${funeral.venue_address ? `  住所: ${funeral.venue_address}\n` : ''}  告別式: ${dateTime(funeral.ceremony_at)}

${setupNote}

───────────────
■ ご手配品（合計 ${totalCount} 基）
───────────────
${summary}

───────────────
■ 名札一覧
───────────────
${nafudaList}

───────────────
${settings.company_name}
${settings.company_postal_code ? `〒${settings.company_postal_code} ` : ''}${settings.company_address}
TEL: ${settings.company_tel}
───────────────

ご不明な点がございましたらご連絡ください。
何卒よろしくお願いいたします。
`;

    return {
        subject: `供花発注 ${dateCompact(funeral.ceremony_at)} (${totalCount})`,
        text,
    };
};

/** 自社宛の受注通知メール */
export const buildInternalNoticeMail = (
    order: MailOrder,
    funeral: MailFuneral,
    items: MailOrderItem[],
): BuiltMail => {
    const paymentLabel = order.payment_method === 'card'
        ? 'クレジットカード'
        : '請求書（後払い）';

    const text = `供花のお申し込みが入りました。

■ 注文
  注文番号: ${order.order_number}
  受付日時: ${dateTime(order.created_at)}
  お支払方法: ${paymentLabel}
  合計: ${yen(order.total)}（税込）

■ お届け先
  故 ${funeral.deceased_name} 様
  式場: ${funeral.venue_name || '—'}
  告別式: ${dateTime(funeral.ceremony_at)}

■ ご注文品
${itemLines(items)}

■ お申込者
${ordererBlock(order)}
${order.remarks ? `\n■ 備考\n  ${order.remarks}\n` : ''}
管理画面から内容をご確認ください。
`;

    return {
        subject: `供花受注 ${order.order_number}`,
        text,
    };
};
