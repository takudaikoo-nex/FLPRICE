import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Funeral, FlowerSettings, FlowerOrder, FlowerOrderItem } from '../../types';
import {
    generatePublicToken, calcOrderDeadline, buildOrderUrl,
    formatDateTime, toDatetimeLocal, fromDatetimeLocal, isAcceptingOrders,
} from '../../lib/flower';
import {
    fetchEstimateSummaries, funeralDateToCeremonyIso, matchesKeyword, formatDate, EstimateSummary,
} from '../../lib/estimateQueries';
import { sendOrderMail } from '../../lib/mail';
import { buildPurchaseOrderMail, isPurchaseOrderTarget } from '../../supabase/functions/_shared/mailTemplates';
import { ChevronLeft, Plus, Edit, Trash2, Link2, Check, FileSearch, Send, X, Eye } from 'lucide-react';

const emptyFuneral = (): Funeral => ({
    id: '',
    estimate_id: null,
    deceased_name: '',
    chief_mourner_name: '',
    venue_name: '',
    venue_address: '',
    wake_at: null,
    ceremony_at: null,
    setup_deadline: null,
    order_deadline: null,
    public_token: generatePublicToken(),
    is_order_open: true,
    note: '',
    discount_type: 'none',
    discount_value: 0,
    discount_note: '',
});

/** 発注書の編集画面に出す注文の状態ラベル */
const orderStateLabel = (order: FlowerOrder): string => {
    if (order.order_status === 'cancelled') return 'キャンセル（受注）';
    if (order.payment_status === 'cancelled') return 'キャンセル（入金）';
    if (order.payment_status === 'refunded') return '返金済';
    return '';
};

interface Props {
    onBack: () => void;
}

const FlowerFuneralsPage: React.FC<Props> = ({ onBack }) => {
    const [funerals, setFunerals] = useState<Funeral[]>([]);
    const [settings, setSettings] = useState<FlowerSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Funeral | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // 見積から受付を作成するためのピッカー
    const [showEstimatePicker, setShowEstimatePicker] = useState(false);
    const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
    const [estimatesLoading, setEstimatesLoading] = useState(false);
    const [estimateKeyword, setEstimateKeyword] = useState('');

    // 葬儀ごとの注文件数（total = 全注文、target = 発注書に載る注文）
    const [orderCounts, setOrderCounts] = useState<Map<string, { total: number; target: number }>>(new Map());

    // 発注書の作成（内容を確認・編集してから送信する）
    const [poFuneral, setPoFuneral] = useState<Funeral | null>(null);
    const [poOrders, setPoOrders] = useState<FlowerOrder[]>([]);
    const [poOriginal, setPoOriginal] = useState<FlowerOrder[]>([]);
    const [poSetupDeadline, setPoSetupDeadline] = useState<string | null>(null);
    const [poLoading, setPoLoading] = useState(false);
    const [poSending, setPoSending] = useState(false);
    const [poPreviewOpen, setPoPreviewOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [funeralsResult, settingsResult, ordersResult] = await Promise.all([
                supabase.from('funerals').select('*').order('ceremony_at', { ascending: false, nullsFirst: false }),
                supabase.from('flower_settings').select('*').eq('id', 1).single(),
                supabase
                    .from('flower_orders')
                    .select('funeral_id, order_status, payment_status, include_in_purchase_order'),
            ]);

            if (funeralsResult.error) throw funeralsResult.error;
            if (settingsResult.error) throw settingsResult.error;
            if (ordersResult.error) throw ordersResult.error;

            const counts = new Map<string, { total: number; target: number }>();
            for (const row of ordersResult.data || []) {
                const current = counts.get(row.funeral_id) || { total: 0, target: 0 };
                current.total += 1;
                if (isPurchaseOrderTarget(row)) current.target += 1;
                counts.set(row.funeral_id, current);
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
            venue_name: estimate.venueName,
            venue_address: estimate.venueAddress,
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
            setup_deadline: editing.setup_deadline,
            order_deadline: calcOrderDeadline(editing.ceremony_at, settings.order_deadline_hours),
            public_token: editing.public_token,
            is_order_open: editing.is_order_open,
            note: editing.note,
            discount_type: editing.discount_type,
            discount_value: editing.discount_type === 'none' ? 0 : editing.discount_value,
            discount_note: editing.discount_note,
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

    /** 発注書の作成画面を開く（その葬儀の注文をすべて読み込む） */
    const openPurchaseOrder = async (funeral: Funeral) => {
        if (!settings?.supplier_email) {
            alert('先に「設定」で供花業者のメールアドレスを登録してください。');
            return;
        }

        setPoFuneral(funeral);
        setPoSetupDeadline(funeral.setup_deadline);
        setPoOrders([]);
        setPoOriginal([]);
        setPoLoading(true);
        try {
            const { data, error } = await supabase
                .from('flower_orders')
                .select('*, flower_order_items(*)')
                .eq('funeral_id', funeral.id)
                .order('created_at', { ascending: true });
            if (error) throw error;

            // 名札の通し番号がメール本文と揃うよう、明細は id 順に固定する
            const rows: FlowerOrder[] = (data || []).map(order => ({
                ...order,
                flower_order_items: [...(order.flower_order_items || [])].sort((a, b) => a.id - b.id),
            }));

            setPoOrders(rows);
            setPoOriginal(JSON.parse(JSON.stringify(rows)));
        } catch (error: any) {
            console.error('Error fetching orders for purchase order:', error);
            alert(`注文の取得に失敗しました: ${error.message || error}`);
            setPoFuneral(null);
        } finally {
            setPoLoading(false);
        }
    };

    const closePurchaseOrder = () => {
        setPoFuneral(null);
        setPoPreviewOpen(false);
        setPoOrders([]);
        setPoOriginal([]);
    };

    const setPoOrderIncluded = (orderId: number, included: boolean) => {
        setPoOrders(prev => prev.map(order => (
            order.id === orderId ? { ...order, include_in_purchase_order: included } : order
        )));
    };

    const patchPoItem = (orderId: number, itemId: number, patch: Partial<FlowerOrderItem>) => {
        setPoOrders(prev => prev.map(order => (
            order.id !== orderId ? order : {
                ...order,
                flower_order_items: (order.flower_order_items || []).map(item => (
                    item.id === itemId ? { ...item, ...patch } : item
                )),
            }
        )));
    };

    /** 画面で変更した箇所（設営期日・発注書の対象・商品コード・名札）だけを保存する */
    const savePurchaseOrderEdits = async () => {
        if (!poFuneral) return;

        if (poSetupDeadline !== poFuneral.setup_deadline) {
            const { error } = await supabase
                .from('funerals')
                .update({ setup_deadline: poSetupDeadline })
                .eq('id', poFuneral.id);
            if (error) throw error;
        }

        for (const order of poOrders) {
            const before = poOriginal.find(o => o.id === order.id);
            if (!before) continue;

            if ((before.include_in_purchase_order ?? null) !== (order.include_in_purchase_order ?? null)) {
                const { error } = await supabase
                    .from('flower_orders')
                    .update({ include_in_purchase_order: order.include_in_purchase_order })
                    .eq('id', order.id);
                if (error) throw error;
            }

            for (const item of order.flower_order_items || []) {
                const itemBefore = (before.flower_order_items || []).find(i => i.id === item.id);
                if (!itemBefore) continue;
                if (itemBefore.product_code === item.product_code && itemBefore.nafuda_name === item.nafuda_name) continue;

                const { error } = await supabase
                    .from('flower_order_items')
                    .update({ product_code: item.product_code.trim(), nafuda_name: item.nafuda_name.trim() })
                    .eq('id', item.id);
                if (error) throw error;
            }
        }
    };

    const handleSavePurchaseOrder = async () => {
        setPoSending(true);
        try {
            await savePurchaseOrderEdits();
            setPoOriginal(JSON.parse(JSON.stringify(poOrders)));
            setPoFuneral(prev => (prev ? { ...prev, setup_deadline: poSetupDeadline } : prev));
            await fetchData();
            alert('発注書の内容を保存しました。');
        } catch (error: any) {
            console.error('Error saving purchase order edits:', error);
            alert(`保存に失敗しました: ${error.message || error}`);
        } finally {
            setPoSending(false);
        }
    };

    /** 業者へ発注書を送る（その葬儀の対象注文をまとめて1通） */
    const handleSendPurchaseOrder = async () => {
        if (!poFuneral || !settings) return;

        const targets = poOrders.filter(isPurchaseOrderTarget);
        if (targets.length === 0) {
            alert('発注書に含める注文がありません。');
            return;
        }

        const message = poFuneral.purchase_order_sent_at
            ? `発注書を再送します（注文 ${targets.length} 件）。よろしいですか？`
            : `${settings.supplier_email} 宛に発注書を送信します（注文 ${targets.length} 件）。よろしいですか？`;
        if (!confirm(message)) return;

        setPoSending(true);
        try {
            // 画面の編集内容を先に保存してから、その内容でメールを組み立てさせる
            await savePurchaseOrderEdits();
            await sendOrderMail('purchase_order', {
                funeralId: poFuneral.id,
                funeralToken: poFuneral.public_token,
            });
            alert('発注書を送信しました。');
            closePurchaseOrder();
            await fetchData();
        } catch (error: any) {
            console.error('Error sending purchase order:', error);
            alert(`送信に失敗しました: ${error.message || error}`);
        } finally {
            setPoSending(false);
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

    /** 発注書メールのプレビュー（送信されるのと同じ組み立てを使う） */
    const poMail = useMemo(() => {
        if (!poFuneral || !settings) return null;
        return buildPurchaseOrderMail(
            { ...poFuneral, setup_deadline: poSetupDeadline },
            poOrders.map(order => ({ ...order, items: order.flower_order_items || [] })),
            settings,
        );
    }, [poFuneral, poOrders, poSetupDeadline, settings]);

    const poTargetCount = poOrders.filter(isPurchaseOrderTarget).length;

    if (loading) return <div className="p-4">読み込み中...</div>;

    const deadlinePreview = editing && settings
        ? formatDateTime(calcOrderDeadline(editing.ceremony_at, settings.order_deadline_hours))
        : '—';

    return (
        <div className="admin-scope fl-shell">
          <div className="fl-page">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button type="button" className="fl-back" onClick={onBack}>
                        <ChevronLeft size={16} />TOP
                    </button>
                    <h3 className="text-lg font-bold text-gray-700">供花 発注URL発行</h3>
                </div>
                <div className="flex items-center gap-2">
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

            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <h3 className="text-xl font-bold mb-4">{isNew ? '受付を作成' : '受付を編集'}</h3>

                        {editing.estimate_id && (
                            <p className="text-sm text-gray-500 mb-4">
                                見積 #{editing.estimate_id} の内容を引き継いでいます。
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">設営期日（任意）</label>
                                    <input
                                        type="datetime-local"
                                        value={toDatetimeLocal(editing.setup_deadline)}
                                        onChange={e => setEditing({ ...editing, setup_deadline: fromDatetimeLocal(e.target.value) })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        業者への発注書に記載します。未設定のときは「告別式の開始まで」と記載します。
                                    </p>
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

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-sm font-medium text-gray-700 mb-3">
                                    このURLからの注文に適用する割引
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">割引の種類</label>
                                        <select
                                            value={editing.discount_type}
                                            onChange={e => setEditing({
                                                ...editing,
                                                discount_type: e.target.value as Funeral['discount_type'],
                                            })}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="none">割引なし</option>
                                            <option value="amount">金額で割引（円）</option>
                                            <option value="percent">率で割引（％）</option>
                                        </select>
                                    </div>

                                    {editing.discount_type !== 'none' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {editing.discount_type === 'amount' ? '割引額（税抜・円）' : '割引率（％）'}
                                            </label>
                                            <input
                                                type="number"
                                                value={editing.discount_value}
                                                onChange={e => setEditing({
                                                    ...editing,
                                                    discount_value: Math.max(0, Number(e.target.value)),
                                                })}
                                                className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                    )}
                                </div>

                                {editing.discount_type !== 'none' && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            割引の表示名（発注画面に表示されます）
                                        </label>
                                        <input
                                            type="text"
                                            value={editing.discount_note}
                                            onChange={e => setEditing({ ...editing, discount_note: e.target.value })}
                                            placeholder="ご紹介割引"
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                )}

                                <p className="text-xs text-gray-400 mt-3">
                                    税抜の小計に対して適用し、消費税は割引後の金額で計算します。1注文ごとの適用です。
                                </p>
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

            {poFuneral && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 modal-scroll">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">発注書の作成</h3>
                            <button
                                onClick={closePurchaseOrder}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                            <div className="font-bold text-gray-800">
                                故 {poFuneral.deceased_name} 様 / {poFuneral.venue_name || '式場未設定'}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                告別式: {formatDateTime(poFuneral.ceremony_at)}
                            </div>
                            <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">設営期日</label>
                                <input
                                    type="datetime-local"
                                    value={toDatetimeLocal(poSetupDeadline)}
                                    onChange={e => setPoSetupDeadline(fromDatetimeLocal(e.target.value))}
                                    className="p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    未設定のときは「告別式の開始までに設営をお願いいたします。」と記載します。
                                </p>
                            </div>
                        </div>

                        {poLoading ? (
                            <div className="p-6 text-center text-gray-400">読み込み中...</div>
                        ) : (
                            <>
                                <div className="text-sm text-gray-500 mb-2">
                                    発注書に載せる注文 {poTargetCount} / {poOrders.length} 件
                                    （キャンセルの注文は既定で外れています）
                                </div>

                                <div className="space-y-3">
                                    {poOrders.map(order => {
                                        const included = isPurchaseOrderTarget(order);
                                        const stateLabel = orderStateLabel(order);
                                        return (
                                            <div
                                                key={order.id}
                                                className={`p-4 rounded-lg border ${included
                                                    ? 'border-gray-200 bg-white'
                                                    : 'border-gray-200 bg-gray-50 opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        id={`po-order-${order.id}`}
                                                        type="checkbox"
                                                        checked={included}
                                                        onChange={e => setPoOrderIncluded(order.id, e.target.checked)}
                                                        className="w-4 h-4 cursor-pointer"
                                                    />
                                                    <label
                                                        htmlFor={`po-order-${order.id}`}
                                                        className="text-sm text-gray-700 cursor-pointer"
                                                    >
                                                        <span className="font-bold">{order.order_number}</span>
                                                        <span className="text-gray-500 ml-2">
                                                            {order.orderer_company
                                                                ? `${order.orderer_company} / ${order.orderer_name}`
                                                                : order.orderer_name}
                                                        </span>
                                                    </label>
                                                    {stateLabel && (
                                                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-bold">
                                                            {stateLabel}
                                                        </span>
                                                    )}
                                                </div>

                                                <table className="w-full text-left border-collapse mt-3">
                                                    <thead className="text-gray-400 text-xs">
                                                        <tr>
                                                            <th className="py-1 w-32">商品コード</th>
                                                            <th className="py-1 w-16 text-center">数量</th>
                                                            <th className="py-1">名札表記</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(order.flower_order_items || []).map(item => (
                                                            <tr key={item.id}>
                                                                <td className="py-1 pr-2">
                                                                    <input
                                                                        type="text"
                                                                        value={item.product_code}
                                                                        onChange={e => patchPoItem(order.id, item.id, {
                                                                            product_code: e.target.value,
                                                                        })}
                                                                        className="w-full p-1 border rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                                                    />
                                                                </td>
                                                                <td className="py-1 text-center text-sm text-gray-600">
                                                                    {item.quantity}
                                                                </td>
                                                                <td className="py-1">
                                                                    <input
                                                                        type="text"
                                                                        value={item.nafuda_name}
                                                                        onChange={e => patchPoItem(order.id, item.id, {
                                                                            nafuda_name: e.target.value,
                                                                        })}
                                                                        className="w-full p-1 border rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })}
                                </div>

                                <p className="text-xs text-gray-400 mt-3">
                                    商品コードと名札表記の変更は注文データにも反映され、請求書メールにも使われます。
                                </p>
                            </>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closePurchaseOrder}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                閉じる
                            </button>
                            <button
                                onClick={handleSavePurchaseOrder}
                                disabled={poSending || poLoading}
                                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                内容を保存
                            </button>
                            <button
                                onClick={() => setPoPreviewOpen(true)}
                                disabled={poLoading}
                                className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                <Eye size={16} />
                                内容を確認
                            </button>
                            <button
                                onClick={handleSendPurchaseOrder}
                                disabled={poSending || poLoading}
                                className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                <Send size={16} />
                                {poSending
                                    ? '送信中...'
                                    : poFuneral.purchase_order_sent_at ? '発注書を再送' : '発注書を送信'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {poPreviewOpen && poMail && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">発注書メールの内容</h3>
                            <button
                                onClick={() => setPoPreviewOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                                件名（宛先: {settings?.supplier_email}）
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">
                                {poMail.subject}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">本文</div>
                            <pre className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 mail-preview">
                                {poMail.text}
                            </pre>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setPoPreviewOpen(false)}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                閉じる
                            </button>
                            <button
                                onClick={handleSendPurchaseOrder}
                                disabled={poSending}
                                className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                <Send size={16} />
                                {poSending ? '送信中...' : 'この内容で送信'}
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
                                            注文 {orderCounts.get(funeral.id)?.total || 0} 件
                                        </div>
                                        {(orderCounts.get(funeral.id)?.total || 0)
                                            !== (orderCounts.get(funeral.id)?.target || 0) && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                発注書に載せる注文 {orderCounts.get(funeral.id)?.target || 0} 件
                                            </div>
                                        )}
                                        {funeral.purchase_order_sent_at ? (
                                            <div className="text-xs text-emerald-700 mt-1">
                                                発注書 {formatDateTime(funeral.purchase_order_sent_at)} 送信済
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-400 mt-1">発注書 未送信</div>
                                        )}
                                        {(orderCounts.get(funeral.id)?.total || 0) > 0 && (
                                            <button
                                                onClick={() => openPurchaseOrder(funeral)}
                                                className="inline-flex items-center gap-1 px-4 py-1 mt-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                                            >
                                                <Send size={12} />
                                                {funeral.purchase_order_sent_at ? '発注書を再作成' : '発注書を作成'}
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
        </div>
    );
};

export default FlowerFuneralsPage;
