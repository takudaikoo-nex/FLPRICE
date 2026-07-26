import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { FlowerOrder, FlowerOrderStatus, FlowerPaymentStatus, Funeral, FlowerSettings } from '../../types';
import { formatDateTime, formatYen, downloadCsv } from '../../lib/flower';
import { sendOrderMail } from '../../lib/mail';
import { buildInvoiceMail } from '../../supabase/functions/_shared/mailTemplates';
import { ChevronLeft, Download, Eye, X, Mail, Check } from 'lucide-react';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
    card: 'クレジットカード',
    invoice: '請求書（後払い）',
};

const PAYMENT_STATUS_LABEL: Record<FlowerPaymentStatus, string> = {
    pending: '未入金',
    paid: '入金済',
    failed: '決済失敗',
    refunded: '返金済',
    cancelled: 'キャンセル',
};

const ORDER_STATUS_LABEL: Record<FlowerOrderStatus, string> = {
    received: '受付',
    confirmed: '確定',
    cancelled: 'キャンセル',
};

interface Props {
    onBack: () => void;
}

const FlowerOrdersPage: React.FC<Props> = ({ onBack }) => {
    const [orders, setOrders] = useState<FlowerOrder[]>([]);
    const [funerals, setFunerals] = useState<Funeral[]>([]);
    const [loading, setLoading] = useState(true);
    const [funeralFilter, setFuneralFilter] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [detail, setDetail] = useState<FlowerOrder | null>(null);
    const [settings, setSettings] = useState<FlowerSettings | null>(null);
    const [preview, setPreview] = useState<{ subject: string; text: string } | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersResult, funeralsResult, settingsResult] = await Promise.all([
                supabase
                    .from('flower_orders')
                    .select('*, flower_order_items(*), funerals(id, deceased_name, ceremony_at, venue_name, venue_address, public_token)')
                    .order('created_at', { ascending: false }),
                supabase.from('funerals').select('*').order('ceremony_at', { ascending: false, nullsFirst: false }),
                supabase.from('flower_settings').select('*').eq('id', 1).single(),
            ]);

            if (ordersResult.error) throw ordersResult.error;
            if (funeralsResult.error) throw funeralsResult.error;
            if (settingsResult.error) throw settingsResult.error;

            setOrders(ordersResult.data || []);
            setFunerals(funeralsResult.data || []);
            setSettings(settingsResult.data);
        } catch (error) {
            console.error('Error fetching flower orders:', error);
            alert('受注データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = useMemo(() => orders.filter(order => {
        if (funeralFilter !== 'all' && order.funeral_id !== funeralFilter) return false;
        if (paymentFilter !== 'all' && order.payment_status !== paymentFilter) return false;
        return true;
    }), [orders, funeralFilter, paymentFilter]);

    const updateOrder = async (order: FlowerOrder, patch: Partial<FlowerOrder>) => {
        try {
            const { error } = await supabase.from('flower_orders').update(patch).eq('id', order.id);
            if (error) throw error;
            await fetchData();
            setDetail(prev => (prev && prev.id === order.id ? { ...prev, ...patch } : prev));
        } catch (error: any) {
            console.error('Error updating flower order:', error);
            alert(`更新に失敗しました: ${error.message}`);
        }
    };

    const showInvoicePreview = (order: FlowerOrder) => {
        if (!settings || !order.funerals) return;
        setPreview(buildInvoiceMail(order, order.funerals, order.flower_order_items || [], settings));
    };

    const MAIL_ERROR_MESSAGE: Record<string, string> = {
        mail_from_not_configured: '「供花の設定」で送信元メールアドレスを登録してください。',
        notify_emails_not_configured: '「供花の設定」で受注通知メールの宛先を登録してください。',
        settings_not_found: '供花の設定が見つかりません。',
        unauthorized: '送信の権限がありません。ログインし直してください。',
    };

    const describeMailError = (error: any): string => {
        const code = String(error?.message || error);
        return MAIL_ERROR_MESSAGE[code]
            || `送信に失敗しました: ${code}。Supabaseの Edge Functions → send-order-mail → Logs も確認してください。`;
    };

    /** 自社への受注通知を送り直す（注文時に送信できていなかった場合） */
    const handleResendNotice = async (order: FlowerOrder) => {
        setSending(true);
        try {
            const result = await sendOrderMail('internal_notice', {
                orderNumber: order.order_number,
                funeralToken: order.funerals?.public_token,
            });
            alert(result?.skipped ? 'この注文はすでに通知済みです。' : '受注通知を送信しました。');
            await fetchData();
        } catch (error: any) {
            console.error('Error resending notice:', error);
            alert(describeMailError(error));
        } finally {
            setSending(false);
        }
    };

    const handleSendInvoice = async (order: FlowerOrder) => {
        if (!confirm(`${order.orderer_email} 宛に請求書を送信します。よろしいですか？`)) return;

        setSending(true);
        try {
            await sendOrderMail('invoice', { orderNumber: order.order_number, funeralToken: order.funerals?.public_token });
            alert('請求書を送信しました。');
            setPreview(null);
            await fetchData();
            setDetail(prev => (prev ? { ...prev, invoice_sent_at: new Date().toISOString() } : prev));
        } catch (error: any) {
            console.error('Error sending invoice:', error);
            alert(describeMailError(error));
        } finally {
            setSending(false);
        }
    };

    const exportNafudaCsv = () => {
        if (filteredOrders.length === 0) {
            alert('出力対象の受注がありません');
            return;
        }

        const rows: (string | number)[][] = [
            ['注文番号', '故人名', '告別式', '商品コード', '商品名', '数量', '名札表記', '申込者', '電話番号', '支払方法', '入金状況'],
        ];

        for (const order of filteredOrders) {
            for (const item of order.flower_order_items || []) {
                rows.push([
                    order.order_number,
                    order.funerals?.deceased_name || '',
                    formatDateTime(order.funerals?.ceremony_at || null),
                    item.product_code,
                    item.product_name,
                    item.quantity,
                    item.nafuda_name,
                    order.orderer_company ? `${order.orderer_company} ${order.orderer_name}` : order.orderer_name,
                    order.orderer_phone,
                    PAYMENT_METHOD_LABEL[order.payment_method] || order.payment_method,
                    PAYMENT_STATUS_LABEL[order.payment_status],
                ]);
            }
        }

        downloadCsv(`供花名札一覧_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    };

    if (loading) return <div className="p-4">読み込み中...</div>;

    return (
        <div className="admin-scope fl-shell">
          <div className="fl-page">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button type="button" className="fl-back" onClick={onBack}>
                        <ChevronLeft size={16} />TOP
                    </button>
                    <h3 className="text-lg font-bold text-gray-700">供花 発注者一覧</h3>
                </div>
                <button
                    onClick={exportNafudaCsv}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                    <Download size={18} />
                    名札一覧をCSV出力
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                    value={funeralFilter}
                    onChange={e => setFuneralFilter(e.target.value)}
                    className="p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                    <option value="all">すべての葬儀</option>
                    {funerals.map(f => (
                        <option key={f.id} value={f.id}>{f.deceased_name} 様</option>
                    ))}
                </select>

                <select
                    value={paymentFilter}
                    onChange={e => setPaymentFilter(e.target.value)}
                    className="p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                    <option value="all">すべての入金状況</option>
                    {(Object.keys(PAYMENT_STATUS_LABEL) as FlowerPaymentStatus[]).map(key => (
                        <option key={key} value={key}>{PAYMENT_STATUS_LABEL[key]}</option>
                    ))}
                </select>

                <span className="text-sm text-gray-500">{filteredOrders.length} 件</span>
            </div>

            {detail && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">注文 {detail.order_number}</h3>
                            <button
                                onClick={() => setDetail(null)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-sm text-gray-500">お届け先の葬儀</div>
                                <div className="font-bold text-gray-800 mt-1">
                                    {detail.funerals?.deceased_name} 様 / {detail.funerals?.venue_name || '式場未設定'}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                    告別式: {formatDateTime(detail.funerals?.ceremony_at || null)}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">注文内容</div>
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th className="p-2">商品</th>
                                            <th className="p-2">名札表記</th>
                                            <th className="p-2 text-center">数量</th>
                                            <th className="p-2 text-right">金額</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(detail.flower_order_items || []).map(item => (
                                            <tr key={item.id}>
                                                <td className="p-2">
                                                    <div className="text-gray-800">{item.product_name}</div>
                                                    <div className="text-xs text-gray-400">{item.product_code}</div>
                                                </td>
                                                <td className="p-2 text-gray-700">{item.nafuda_name || '—'}</td>
                                                <td className="p-2 text-center text-gray-700">{item.quantity}</td>
                                                <td className="p-2 text-right text-gray-700">
                                                    {formatYen(item.unit_price * item.quantity)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-200">
                                    <span className="text-sm text-gray-500">
                                        小計 {formatYen(detail.subtotal)}
                                        {detail.discount > 0 && ` / 割引 -${formatYen(detail.discount)}`}
                                        {' / '}消費税 {formatYen(detail.tax)}
                                    </span>
                                    <span className="text-xl font-bold text-gray-800">
                                        合計 {formatYen(detail.total)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">申込者</div>
                                <div className="text-gray-700">
                                    {detail.orderer_company && <div>{detail.orderer_company}</div>}
                                    <div className="font-bold">
                                        {detail.orderer_name}
                                        {detail.orderer_kana && <span className="text-sm text-gray-400 ml-2">{detail.orderer_kana}</span>}
                                    </div>
                                    <div className="text-sm mt-1">{detail.orderer_phone} / {detail.orderer_email}</div>
                                    <div className="text-sm">
                                        {detail.orderer_postal_code && `〒${detail.orderer_postal_code} `}
                                        {detail.orderer_address}
                                    </div>
                                    {detail.relation && <div className="text-sm mt-1">故人との関係: {detail.relation}</div>}
                                    {detail.remarks && <div className="text-sm mt-1">備考: {detail.remarks}</div>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">受注ステータス</label>
                                    <select
                                        value={detail.order_status}
                                        onChange={e => updateOrder(detail, { order_status: e.target.value as FlowerOrderStatus })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        {(Object.keys(ORDER_STATUS_LABEL) as FlowerOrderStatus[]).map(key => (
                                            <option key={key} value={key}>{ORDER_STATUS_LABEL[key]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        入金状況（{PAYMENT_METHOD_LABEL[detail.payment_method]}）
                                    </label>
                                    <select
                                        value={detail.payment_status}
                                        onChange={e => updateOrder(detail, { payment_status: e.target.value as FlowerPaymentStatus })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        {(Object.keys(PAYMENT_STATUS_LABEL) as FlowerPaymentStatus[]).map(key => (
                                            <option key={key} value={key}>{PAYMENT_STATUS_LABEL[key]}</option>
                                        ))}
                                    </select>
                                    {detail.payment_method === 'card' && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            カード決済はP3でStripeと自動連携します
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-sm font-medium text-gray-700">請求書メール</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {detail.invoice_sent_at
                                                ? `${formatDateTime(detail.invoice_sent_at)} に ${detail.orderer_email} へ送信済み`
                                                : `送信先: ${detail.orderer_email}`}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {detail.notified_at
                                                ? `自社への受注通知: ${formatDateTime(detail.notified_at)}`
                                                : '自社への受注通知: 未送信'}
                                            {!detail.notified_at && (
                                                <button
                                                    onClick={() => handleResendNotice(detail)}
                                                    disabled={sending}
                                                    className="ml-2 text-emerald-700"
                                                >
                                                    送信する
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => showInvoicePreview(detail)}
                                            className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                        >
                                            <Eye size={16} />
                                            内容を確認
                                        </button>
                                        <button
                                            onClick={() => handleSendInvoice(detail)}
                                            disabled={sending}
                                            className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                        >
                                            <Mail size={16} />
                                            {detail.invoice_sent_at ? '再送する' : '請求書を送信'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setDetail(null)}
                                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {preview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">請求書メールの内容</h3>
                            <button
                                onClick={() => setPreview(null)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="text-sm font-medium text-gray-700 mb-1">件名</div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">
                                {preview.subject}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">本文</div>
                            <pre className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 mail-preview">
                                {preview.text}
                            </pre>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setPreview(null)}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                閉じる
                            </button>
                            {detail && (
                                <button
                                    onClick={() => handleSendInvoice(detail)}
                                    disabled={sending}
                                    className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                >
                                    <Mail size={16} />
                                    {sending ? '送信中...' : 'この内容で送信'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 w-32">注文番号</th>
                            <th className="p-4">葬儀 / 申込者</th>
                            <th className="p-4 w-40">支払方法</th>
                            <th className="p-4 w-32">入金状況</th>
                            <th className="p-4 w-32 text-right">合計</th>
                            <th className="p-4 w-24 text-center">詳細</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                    <div className="font-bold text-gray-700">{order.order_number}</div>
                                    <div className="text-xs text-gray-400 mt-1">{formatDateTime(order.created_at)}</div>
                                    {order.invoice_sent_at && (
                                        <div className="inline-flex items-center gap-1 text-xs text-emerald-700 mt-1">
                                            <Check size={12} />請求書送信済
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="text-gray-800">{order.funerals?.deceased_name} 様</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {order.orderer_company ? `${order.orderer_company} / ` : ''}{order.orderer_name}
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600">{PAYMENT_METHOD_LABEL[order.payment_method]}</td>
                                <td className="p-4">
                                    <span className={`px-4 py-1 rounded-full text-xs font-bold ${order.payment_status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {PAYMENT_STATUS_LABEL[order.payment_status]}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-bold text-gray-700">{formatYen(order.total)}</td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => setDetail(order)}
                                        className="p-1 text-gray-400 hover:text-emerald-600 rounded"
                                        title="詳細"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-gray-400">
                                    受注がまだありません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
    );
};

export default FlowerOrdersPage;
