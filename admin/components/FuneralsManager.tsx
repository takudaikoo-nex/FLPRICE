import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Funeral, FlowerSettings } from '../../types';
import {
    generatePublicToken, calcOrderDeadline, buildOrderUrl,
    formatDateTime, toDatetimeLocal, fromDatetimeLocal, isAcceptingOrders,
} from '../../lib/flower';
import {
    fetchEstimateSummaries, funeralDateToCeremonyIso, matchesKeyword, formatDate, EstimateSummary,
} from '../../lib/estimateQueries';
import { sendOrderMail } from '../../lib/mail';
import { Plus, Edit, Trash2, Link2, Settings, Check, FileSearch, Send } from 'lucide-react';

const emptyFuneral = (): Funeral => ({
    id: '',
    estimate_id: null,
    deceased_name: '',
    chief_mourner_name: '',
    venue_name: '',
    venue_address: '',
    wake_at: null,
    ceremony_at: null,
    order_deadline: null,
    public_token: generatePublicToken(),
    is_order_open: true,
    note: '',
});

const FuneralsManager: React.FC = () => {
    const [funerals, setFunerals] = useState<Funeral[]>([]);
    const [settings, setSettings] = useState<FlowerSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Funeral | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // 見積から受付を作成するためのピッカー
    const [showEstimatePicker, setShowEstimatePicker] = useState(false);
    const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
    const [estimatesLoading, setEstimatesLoading] = useState(false);
    const [estimateKeyword, setEstimateKeyword] = useState('');

    // 葬儀ごとの注文件数（発注書の送信可否の判定に使う）
    const [orderCounts, setOrderCounts] = useState<Map<string, number>>(new Map());
    const [sendingPoId, setSendingPoId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [funeralsResult, settingsResult, ordersResult] = await Promise.all([
                supabase.from('funerals').select('*').order('ceremony_at', { ascending: false, nullsFirst: false }),
                supabase.from('flower_settings').select('*').eq('id', 1).single(),
                supabase.from('flower_orders').select('funeral_id').neq('order_status', 'cancelled'),
            ]);

            if (funeralsResult.error) throw funeralsResult.error;
            if (settingsResult.error) throw settingsResult.error;
            if (ordersResult.error) throw ordersResult.error;

            const counts = new Map<string, number>();
            for (const row of ordersResult.data || []) {
                counts.set(row.funeral_id, (counts.get(row.funeral_id) || 0) + 1);
            }

            setFunerals(funeralsResult.data || []);
            setSettings(settingsResult.data);
            setOrderCounts(counts);
        } catch (error) {
            console.error('Error fetching funerals:', error);
            alert('葬儀データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const openEstimatePicker = async () => {
        setShowEstimatePicker(true);
        setEstimateKeyword('');
        if (estimates.length > 0) return;

        setEstimatesLoading(true);
        try {
            setEstimates(await fetchEstimateSummaries());
        } catch (error) {
            console.error('Error fetching estimates:', error);
            alert('見積の取得に失敗しました');
        } finally {
            setEstimatesLoading(false);
        }
    };

    /** 見積の内容をもとに受付を下書きする（故人名・喪主名・告別式日・見積番号を引き継ぐ） */
    const createFromEstimate = (estimate: EstimateSummary) => {
        const existing = funerals.find(f => f.estimate_id === estimate.id);
        if (existing) {
            alert(`見積 #${estimate.id} の受付はすでに作成されています。`);
            setShowEstimatePicker(false);
            setEditing({ ...existing });
            setIsNew(false);
            return;
        }

        setEditing({
            ...emptyFuneral(),
            estimate_id: estimate.id,
            deceased_name: estimate.deceasedName,
            chief_mourner_name: estimate.chiefMournerName,
            ceremony_at: funeralDateToCeremonyIso(estimate.funeralDate),
        });
        setIsNew(true);
        setShowEstimatePicker(false);
    };

    const handleSave = async () => {
        if (!editing || !settings) return;
        if (!editing.deceased_name.trim()) {
            alert('故人名は必須です');
            return;
        }

        const payload = {
            estimate_id: editing.estimate_id,
            deceased_name: editing.deceased_name.trim(),
            chief_mourner_name: editing.chief_mourner_name,
            venue_name: editing.venue_name,
            venue_address: editing.venue_address,
            wake_at: editing.wake_at,
            ceremony_at: editing.ceremony_at,
            order_deadline: calcOrderDeadline(editing.ceremony_at, settings.order_deadline_hours),
            public_token: editing.public_token,
            is_order_open: editing.is_order_open,
            note: editing.note,
        };

        try {
            if (isNew) {
                const { error } = await supabase.from('funerals').insert([payload]);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('funerals').update(payload).eq('id', editing.id);
                if (error) throw error;
            }

            await fetchData();
            setEditing(null);
            setIsNew(false);
        } catch (error: any) {
            console.error('Error saving funeral:', error);
            alert(`保存に失敗しました: ${error.message}`);
        }
    };

    const handleDelete = async (funeral: Funeral) => {
        if (!confirm(`「${funeral.deceased_name}」の受付を削除しますか？この操作は取り消せません。`)) return;

        try {
            const { error } = await supabase.from('funerals').delete().eq('id', funeral.id);
            if (error) throw error;
            await fetchData();
        } catch (error: any) {
            console.error('Error deleting funeral:', error);
            alert(`削除に失敗しました。受注のある葬儀は削除できません: ${error.message}`);
        }
    };

    const toggleOrderOpen = async (funeral: Funeral) => {
        try {
            const { error } = await supabase
                .from('funerals')
                .update({ is_order_open: !funeral.is_order_open })
                .eq('id', funeral.id);
            if (error) throw error;
            await fetchData();
        } catch (error: any) {
            console.error('Error toggling order status:', error);
            alert(`受付状態の変更に失敗しました: ${error.message}`);
        }
    };

    /** 業者へ発注書を送る（その葬儀の全注文をまとめて1通） */
    const handleSendPurchaseOrder = async (funeral: Funeral) => {
        const count = orderCounts.get(funeral.id) || 0;
        if (count === 0) {
            alert('この葬儀にはまだ注文がありません。');
            return;
        }
        if (!settings?.supplier_email) {
            alert('先に「設定」で供花業者のメールアドレスを登録してください。');
            return;
        }

        const message = funeral.purchase_order_sent_at
            ? `発注書を再送します（注文 ${count} 件）。よろしいですか？`
            : `${settings.supplier_email} 宛に発注書を送信します（注文 ${count} 件）。よろしいですか？`;
        if (!confirm(message)) return;

        setSendingPoId(funeral.id);
        try {
            await sendOrderMail('purchase_order', { funeralId: funeral.id });
            alert('発注書を送信しました。');
            await fetchData();
        } catch (error: any) {
            console.error('Error sending purchase order:', error);
            alert(`送信に失敗しました: ${error.message || error}`);
        } finally {
            setSendingPoId(null);
        }
    };

    const copyOrderUrl = async (funeral: Funeral) => {
        if (!settings?.site_base_url) {
            alert('先に「設定」で供花サイトのベースURLを登録してください');
            return;
        }
        try {
            await navigator.clipboard.writeText(buildOrderUrl(settings.site_base_url, funeral.public_token));
            setCopiedId(funeral.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            alert('コピーに失敗しました');
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        try {
            const { error } = await supabase
                .from('flower_settings')
                .update({
                    site_base_url: settings.site_base_url.trim(),
                    order_deadline_hours: settings.order_deadline_hours,
                    notify_emails: settings.notify_emails,
                    card_payment_enabled: settings.card_payment_enabled,
                    mail_from: settings.mail_from.trim(),
                    mail_from_name: settings.mail_from_name,
                    company_name: settings.company_name,
                    company_postal_code: settings.company_postal_code,
                    company_address: settings.company_address,
                    company_tel: settings.company_tel,
                    invoice_registration_number: settings.invoice_registration_number,
                    payment_due_days: settings.payment_due_days,
                    bank_info: settings.bank_info,
                    supplier_name: settings.supplier_name,
                    supplier_email: settings.supplier_email.trim(),
                })
                .eq('id', 1);
            if (error) throw error;

            const upcoming = funerals.filter(f => f.ceremony_at && new Date(f.ceremony_at).getTime() > Date.now());
            if (upcoming.length > 0 && confirm(`今後の葬儀 ${upcoming.length} 件の受付締切を再計算しますか？`)) {
                for (const f of upcoming) {
                    const { error: updateError } = await supabase
                        .from('funerals')
                        .update({ order_deadline: calcOrderDeadline(f.ceremony_at, settings.order_deadline_hours) })
                        .eq('id', f.id);
                    if (updateError) throw updateError;
                }
            }

            await fetchData();
            setShowSettings(false);
        } catch (error: any) {
            console.error('Error saving flower settings:', error);
            alert(`設定の保存に失敗しました: ${error.message}`);
        }
    };

    if (loading) return <div className="p-4">読み込み中...</div>;

    const deadlinePreview = editing && settings
        ? formatDateTime(calcOrderDeadline(editing.ceremony_at, settings.order_deadline_hours))
        : '—';

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-700">葬儀・発注受付管理</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        <Settings size={18} />
                        設定
                    </button>
                    <button
                        onClick={() => { setEditing(emptyFuneral()); setIsNew(true); }}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        <Plus size={18} />
                        手動で作成
                    </button>
                    <button
                        onClick={openEstimatePicker}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                        <FileSearch size={18} />
                        見積から受付を作成
                    </button>
                </div>
            </div>

            {showEstimatePicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <h3 className="text-xl font-bold mb-4">見積を選択</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            選んだ見積の故人名・喪主名・葬儀日を引き継いで受付を作成します。
                        </p>

                        <input
                            type="text"
                            value={estimateKeyword}
                            onChange={e => setEstimateKeyword(e.target.value)}
                            placeholder="故人名・申込者名・見積番号で絞り込み"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none mb-4"
                            autoFocus
                        />

                        {estimatesLoading ? (
                            <div className="p-6 text-center text-gray-400">読み込み中...</div>
                        ) : (
                            <div className="border border-gray-200 rounded-lg">
                                <table className="w-full text-left border-collapse">
                                    <tbody className="divide-y divide-gray-100">
                                        {estimates
                                            .filter(e => matchesKeyword(e, estimateKeyword))
                                            .slice(0, 50)
                                            .map(estimate => {
                                                const used = funerals.some(f => f.estimate_id === estimate.id);
                                                return (
                                                    <tr
                                                        key={estimate.id}
                                                        onClick={() => createFromEstimate(estimate)}
                                                        className="hover:bg-gray-50 cursor-pointer"
                                                    >
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-800">
                                                                {estimate.deceasedName
                                                                    ? `故 ${estimate.deceasedName} 様`
                                                                    : '（故人名未入力）'}
                                                                {used && (
                                                                    <span className="text-xs text-emerald-700 ml-2">
                                                                        受付作成済み
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                見積 #{estimate.id} / {estimate.customerName}
                                                                {estimate.funeralDate && ` / 葬儀日 ${estimate.funeralDate}`}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right text-gray-500 text-sm">
                                                            {formatDate(estimate.createdAt)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>

                                {estimates.filter(e => matchesKeyword(e, estimateKeyword)).length === 0 && (
                                    <div className="p-6 text-center text-gray-400">
                                        該当する見積が見つかりません
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowEstimatePicker(false)}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSettings && settings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <h3 className="text-xl font-bold mb-4">供花発注の設定</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    供花サイトのベースURL
                                </label>
                                <input
                                    type="text"
                                    value={settings.site_base_url}
                                    onChange={e => setSettings({ ...settings, site_base_url: e.target.value })}
                                    placeholder="https://example.com"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    発注URLは「ベースURL/order/トークン」の形式で発行されます
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    受付締切（告別式の何時間前）
                                </label>
                                <input
                                    type="number"
                                    value={settings.order_deadline_hours}
                                    onChange={e => setSettings({ ...settings, order_deadline_hours: Number(e.target.value) })}
                                    className="w-32 p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    受注通知メール（カンマ区切り）
                                </label>
                                <input
                                    type="text"
                                    value={settings.notify_emails.join(', ')}
                                    onChange={e => setSettings({
                                        ...settings,
                                        notify_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                                    })}
                                    placeholder="info@example.com, staff@example.com"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">メール送信の実装はP4で対応します</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="card_payment_enabled"
                                    type="checkbox"
                                    checked={settings.card_payment_enabled}
                                    onChange={e => setSettings({ ...settings, card_payment_enabled: e.target.checked })}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="card_payment_enabled" className="text-sm text-gray-700 cursor-pointer">
                                    発注サイトでクレジットカード決済を受け付ける
                                </label>
                            </div>
                            <p className="text-xs text-gray-400">
                                Stripe連携（P3）が完了するまではオフのままにしてください。オフの間は請求書払いのみ表示されます。
                            </p>

                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="font-bold text-gray-700 mb-1">供花業者</h4>
                                <p className="text-xs text-gray-400 mb-4">
                                    発注書の送信先です。発注書は葬儀ごとに、その葬儀の全注文をまとめて1通送ります。
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">業者名</label>
                                        <input
                                            type="text"
                                            value={settings.supplier_name}
                                            onChange={e => setSettings({ ...settings, supplier_name: e.target.value })}
                                            placeholder="〇〇生花店"
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">業者のメールアドレス</label>
                                        <input
                                            type="text"
                                            value={settings.supplier_email}
                                            onChange={e => setSettings({ ...settings, supplier_email: e.target.value })}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="font-bold text-gray-700 mb-1">請求書・メール送信</h4>
                                <p className="text-xs text-gray-400 mb-4">
                                    請求書メールに記載する自社情報です。SMTPの接続情報はここではなくSupabaseのシークレットに設定します。
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">送信元メールアドレス</label>
                                        <input
                                            type="text"
                                            value={settings.mail_from}
                                            onChange={e => setSettings({ ...settings, mail_from: e.target.value })}
                                            placeholder="info@example.co.jp"
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">送信元の表示名</label>
                                        <input
                                            type="text"
                                            value={settings.mail_from_name}
                                            onChange={e => setSettings({ ...settings, mail_from_name: e.target.value })}
                                            placeholder="ファーストリーフ"
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">事業者名</label>
                                    <input
                                        type="text"
                                        value={settings.company_name}
                                        onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                                        <input
                                            type="text"
                                            value={settings.company_postal_code}
                                            onChange={e => setSettings({ ...settings, company_postal_code: e.target.value })}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                                        <input
                                            type="text"
                                            value={settings.company_tel}
                                            onChange={e => setSettings({ ...settings, company_tel: e.target.value })}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                                    <input
                                        type="text"
                                        value={settings.company_address}
                                        onChange={e => setSettings({ ...settings, company_address: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">インボイス登録番号</label>
                                        <input
                                            type="text"
                                            value={settings.invoice_registration_number}
                                            onChange={e => setSettings({ ...settings, invoice_registration_number: e.target.value })}
                                            placeholder="T1234567890123"
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">支払期限（注文日から何日）</label>
                                        <input
                                            type="number"
                                            value={settings.payment_due_days}
                                            onChange={e => setSettings({ ...settings, payment_due_days: Number(e.target.value) })}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">お振込先</label>
                                    <textarea
                                        value={settings.bank_info}
                                        onChange={e => setSettings({ ...settings, bank_info: e.target.value })}
                                        placeholder={'  〇〇銀行 〇〇支店\n  普通 1234567\n  カ)ファーストリーフ'}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">請求書メールにこのまま記載されます（改行可）</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => { setShowSettings(false); fetchData(); }}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                保存する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <h3 className="text-xl font-bold mb-4">{isNew ? '受付を作成' : '受付を編集'}</h3>

                        {editing.estimate_id && (
                            <p className="text-sm text-gray-500 mb-4">
                                見積 #{editing.estimate_id} から引き継ぎました。式場情報は見積に含まれないため、必要に応じて入力してください。
                            </p>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">故人名</label>
                                    <input
                                        type="text"
                                        value={editing.deceased_name}
                                        onChange={e => setEditing({ ...editing, deceased_name: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">喪主名</label>
                                    <input
                                        type="text"
                                        value={editing.chief_mourner_name}
                                        onChange={e => setEditing({ ...editing, chief_mourner_name: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">式場名</label>
                                    <input
                                        type="text"
                                        value={editing.venue_name}
                                        onChange={e => setEditing({ ...editing, venue_name: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">式場住所</label>
                                    <input
                                        type="text"
                                        value={editing.venue_address}
                                        onChange={e => setEditing({ ...editing, venue_address: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">通夜（日時）</label>
                                    <input
                                        type="datetime-local"
                                        value={toDatetimeLocal(editing.wake_at)}
                                        onChange={e => setEditing({ ...editing, wake_at: fromDatetimeLocal(e.target.value) })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">告別式（日時）</label>
                                    <input
                                        type="datetime-local"
                                        value={toDatetimeLocal(editing.ceremony_at)}
                                        onChange={e => setEditing({ ...editing, ceremony_at: fromDatetimeLocal(e.target.value) })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-sm text-gray-600">
                                    受付締切（告別式の {settings?.order_deadline_hours ?? 24} 時間前・自動計算）
                                </div>
                                <div className="text-lg font-bold text-gray-800 mt-1">{deadlinePreview}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        見積番号（任意）
                                    </label>
                                    <input
                                        type="number"
                                        value={editing.estimate_id ?? ''}
                                        onChange={e => setEditing({
                                            ...editing,
                                            estimate_id: e.target.value ? Number(e.target.value) : null,
                                        })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <input
                                        id="is_order_open"
                                        type="checkbox"
                                        checked={editing.is_order_open}
                                        onChange={e => setEditing({ ...editing, is_order_open: e.target.checked })}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    <label htmlFor="is_order_open" className="text-sm text-gray-700 cursor-pointer">
                                        供花の受付を開始する
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">備考（社内メモ）</label>
                                <textarea
                                    value={editing.note}
                                    onChange={e => setEditing({ ...editing, note: e.target.value })}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => { setEditing(null); setIsNew(false); }}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                保存する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4">故人 / 式場</th>
                            <th className="p-4 w-48">告別式</th>
                            <th className="p-4 w-48">受付締切</th>
                            <th className="p-4 w-32 text-center">受付状態</th>
                            <th className="p-4 w-48">注文・発注書</th>
                            <th className="p-4 w-40 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {funerals.map(funeral => {
                            const accepting = isAcceptingOrders(funeral.is_order_open, funeral.order_deadline);
                            return (
                                <tr key={funeral.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{funeral.deceased_name} 様</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {funeral.venue_name || '式場未設定'}
                                            {funeral.estimate_id ? ` / 見積 #${funeral.estimate_id}` : ''}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{formatDateTime(funeral.ceremony_at)}</td>
                                    <td className="p-4 text-gray-600">{formatDateTime(funeral.order_deadline)}</td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => toggleOrderOpen(funeral)}
                                            className={`px-4 py-1 rounded-full text-xs font-bold ${accepting
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}
                                            title="クリックで受付の開始/停止"
                                        >
                                            {accepting ? '受付中' : funeral.is_order_open ? '締切済' : '停止中'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-gray-600">
                                            注文 {orderCounts.get(funeral.id) || 0} 件
                                        </div>
                                        {funeral.purchase_order_sent_at ? (
                                            <div className="text-xs text-emerald-700 mt-1">
                                                発注書 {formatDateTime(funeral.purchase_order_sent_at)} 送信済
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-400 mt-1">発注書 未送信</div>
                                        )}
                                        {(orderCounts.get(funeral.id) || 0) > 0 && (
                                            <button
                                                onClick={() => handleSendPurchaseOrder(funeral)}
                                                disabled={sendingPoId === funeral.id}
                                                className="inline-flex items-center gap-1 px-4 py-1 mt-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                                            >
                                                <Send size={12} />
                                                {sendingPoId === funeral.id
                                                    ? '送信中...'
                                                    : funeral.purchase_order_sent_at ? '発注書を再送' : '発注書を送信'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => copyOrderUrl(funeral)}
                                                className="p-1 text-gray-400 hover:text-emerald-600 rounded"
                                                title="発注URLをコピー"
                                            >
                                                {copiedId === funeral.id ? <Check size={18} /> : <Link2 size={18} />}
                                            </button>
                                            <button
                                                onClick={() => { setEditing({ ...funeral }); setIsNew(false); }}
                                                className="p-1 text-gray-400 hover:text-emerald-600 rounded"
                                                title="編集"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(funeral)}
                                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                title="削除"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {funerals.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-gray-400">
                                    受付がまだ作成されていません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FuneralsManager;
