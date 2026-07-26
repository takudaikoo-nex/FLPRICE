import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FlowerSettings } from '../../types';
import { calcOrderDeadline } from '../../lib/flower';
import { Save } from 'lucide-react';

/**
 * 供花発注の設定。
 * 発注URLの発行と受注一覧はユーザー画面（見積システム側）へ移したが、
 * 設定とマスタ管理は管理画面に残している。
 */
const FlowerSettingsManager: React.FC = () => {
    const [settings, setSettings] = useState<FlowerSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('flower_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) throw error;
            setSettings(data);
        } catch (error) {
            console.error('Error fetching flower settings:', error);
            alert('設定の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const update = (patch: Partial<FlowerSettings>) => {
        if (settings) setSettings({ ...settings, ...patch });
    };

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
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

            // 締切の基準時間を変えた場合、今後の葬儀に反映するか確認する
            const { data: upcoming, error: fetchError } = await supabase
                .from('funerals')
                .select('id, ceremony_at')
                .gt('ceremony_at', new Date().toISOString());

            if (fetchError) throw fetchError;

            if ((upcoming?.length ?? 0) > 0
                && confirm(`今後の葬儀 ${upcoming!.length} 件の受付締切を再計算しますか？`)) {
                for (const funeral of upcoming!) {
                    const { error: updateError } = await supabase
                        .from('funerals')
                        .update({
                            order_deadline: calcOrderDeadline(funeral.ceremony_at, settings.order_deadline_hours),
                        })
                        .eq('id', funeral.id);
                    if (updateError) throw updateError;
                }
            }

            alert('設定を保存しました。');
            await fetchSettings();
        } catch (error: any) {
            console.error('Error saving flower settings:', error);
            alert(`設定の保存に失敗しました: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4">読み込み中...</div>;
    if (!settings) return <div className="p-4">設定が見つかりません</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-700">供花発注の設定</h3>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                    <Save size={18} />
                    {saving ? '保存中...' : '保存する'}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h4 className="font-bold text-gray-700">発注サイト</h4>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供花サイトのベースURL</label>
                    <input
                        type="text"
                        value={settings.site_base_url}
                        onChange={e => update({ site_base_url: e.target.value })}
                        placeholder="https://example.vercel.app"
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
                        onChange={e => update({ order_deadline_hours: Number(e.target.value) })}
                        className="w-32 p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        id="card_payment_enabled"
                        type="checkbox"
                        checked={settings.card_payment_enabled}
                        onChange={e => update({ card_payment_enabled: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="card_payment_enabled" className="text-sm text-gray-700 cursor-pointer">
                        発注サイトでクレジットカード決済を受け付ける
                    </label>
                </div>
                <p className="text-xs text-gray-400">
                    Stripe連携が完了するまではオフのままにしてください。オフの間は請求書払いのみ表示されます。
                </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 mt-6">
                <h4 className="font-bold text-gray-700">供花業者</h4>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">業者名</label>
                        <input
                            type="text"
                            value={settings.supplier_name}
                            onChange={e => update({ supplier_name: e.target.value })}
                            placeholder="〇〇生花店"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">業者のメールアドレス</label>
                        <input
                            type="text"
                            value={settings.supplier_email}
                            onChange={e => update({ supplier_email: e.target.value })}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-400">
                    発注書は葬儀ごとに、その葬儀の全注文をまとめて1通送ります。
                </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 mt-6">
                <h4 className="font-bold text-gray-700">メール送信・請求書</h4>
                <p className="text-xs text-gray-400">
                    SMTPの接続情報はここではなくSupabaseのシークレットに設定します。
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">送信元メールアドレス</label>
                        <input
                            type="text"
                            value={settings.mail_from}
                            onChange={e => update({ mail_from: e.target.value })}
                            placeholder="info@example.co.jp"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">送信元の表示名</label>
                        <input
                            type="text"
                            value={settings.mail_from_name}
                            onChange={e => update({ mail_from_name: e.target.value })}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        受注通知メール（カンマ区切り）
                    </label>
                    <input
                        type="text"
                        value={settings.notify_emails.join(', ')}
                        onChange={e => update({
                            notify_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        })}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">事業者名</label>
                    <input
                        type="text"
                        value={settings.company_name}
                        onChange={e => update({ company_name: e.target.value })}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                        <input
                            type="text"
                            value={settings.company_postal_code}
                            onChange={e => update({ company_postal_code: e.target.value })}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                        <input
                            type="text"
                            value={settings.company_tel}
                            onChange={e => update({ company_tel: e.target.value })}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                    <input
                        type="text"
                        value={settings.company_address}
                        onChange={e => update({ company_address: e.target.value })}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">インボイス登録番号</label>
                        <input
                            type="text"
                            value={settings.invoice_registration_number}
                            onChange={e => update({ invoice_registration_number: e.target.value })}
                            placeholder="T1234567890123"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            支払期限（注文日から何日）
                        </label>
                        <input
                            type="number"
                            value={settings.payment_due_days}
                            onChange={e => update({ payment_due_days: Number(e.target.value) })}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">お振込先</label>
                    <textarea
                        value={settings.bank_info}
                        onChange={e => update({ bank_info: e.target.value })}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                    />
                    <p className="text-xs text-gray-400 mt-1">請求書メールにこのまま記載されます（改行可）</p>
                </div>
            </div>
        </div>
    );
};

export default FlowerSettingsManager;
