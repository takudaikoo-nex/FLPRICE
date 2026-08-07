import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plan, Item } from '../../types';
import { convertDbItem, convertDbPlan } from '../../lib/converter';
import {
    CaseTaskTemplate, OWNER_LABEL, PHASE_LABEL, PHASE_ORDER, TaskOwner, TaskPhase,
    fetchTaskTemplates,
} from '../../lib/caseTasks';
import { fetchTaskSiteBaseUrl, saveTaskSiteBaseUrl } from '../../lib/caseAccess';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, EyeOff } from 'lucide-react';

const CATEGORY_LABEL: Record<string, string> = {
    cremation: '火葬式',
    funeral: '葬儀',
};

const emptyTemplate = (sortOrder: number): CaseTaskTemplate => ({
    id: '',
    code: '',
    title: '',
    description: '',
    phase: 'prepare',
    owner: 'both',
    visible_to_mourner: true,
    target_categories: [],
    target_plan_ids: [],
    related_item_id: null,
    require_flower: false,
    due_offset_days: null,
    auto_complete_on: null,
    initial_status: 'todo',
    sort_order: sortOrder,
    is_active: true,
});

/** 一覧に出す生成条件の要約 */
const describeConditions = (template: CaseTaskTemplate, items: Item[]): string => {
    const parts: string[] = [];

    if (template.target_categories.length > 0) {
        parts.push(template.target_categories.map(c => CATEGORY_LABEL[c] ?? c).join('・'));
    }
    if (template.target_plan_ids.length > 0) {
        parts.push(`${template.target_plan_ids.length}プラン限定`);
    }
    if (template.related_item_id !== null) {
        const item = items.find(i => i.id === template.related_item_id);
        parts.push(`関連: ${item ? item.name : `#${template.related_item_id}`}`);
    }
    if (template.require_flower) parts.push('供花の受付あり');

    return parts.length > 0 ? parts.join(' / ') : '常に生成';
};

const CaseTaskTemplatesManager: React.FC = () => {
    const [templates, setTemplates] = useState<CaseTaskTemplate[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<CaseTaskTemplate | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [siteBaseUrl, setSiteBaseUrl] = useState('');
    const [urlSaving, setUrlSaving] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [templateData, planResult, itemResult, baseUrl] = await Promise.all([
                fetchTaskTemplates(),
                supabase.from('plans').select('*'),
                supabase.from('items').select('*').order('id'),
                fetchTaskSiteBaseUrl(),
            ]);

            if (planResult.error) throw planResult.error;
            if (itemResult.error) throw itemResult.error;

            setTemplates(templateData);
            setPlans((planResult.data || []).map(convertDbPlan));
            setItems((itemResult.data || []).map(convertDbItem));
            setSiteBaseUrl(baseUrl);
        } catch (error) {
            console.error('Error fetching task templates:', error);
            alert('タスクマスタの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const startNew = () => {
        const maxOrder = templates.reduce((max, t) => Math.max(max, t.sort_order), 0);
        setEditing(emptyTemplate(maxOrder + 10));
        setIsNew(true);
    };

    const handleSave = async () => {
        if (!editing) return;
        if (!editing.code.trim() || !editing.title.trim()) {
            alert('コードと項目名は必須です');
            return;
        }

        const payload = {
            code: editing.code.trim(),
            title: editing.title.trim(),
            description: editing.description,
            phase: editing.phase,
            owner: editing.owner,
            visible_to_mourner: editing.visible_to_mourner,
            target_categories: editing.target_categories,
            target_plan_ids: editing.target_plan_ids,
            related_item_id: editing.related_item_id,
            require_flower: editing.require_flower,
            due_offset_days: editing.due_offset_days,
            auto_complete_on: editing.auto_complete_on,
            initial_status: editing.initial_status,
            sort_order: editing.sort_order,
            is_active: editing.is_active,
        };

        try {
            if (isNew) {
                const { error } = await supabase.from('case_task_templates').insert([payload]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('case_task_templates').update(payload).eq('id', editing.id);
                if (error) throw error;
            }

            await loadAll();
            setEditing(null);
            setIsNew(false);
        } catch (error: any) {
            console.error('Error saving task template:', error);
            alert(`保存に失敗しました: ${error.message}`);
        }
    };

    const handleDelete = async (template: CaseTaskTemplate) => {
        if (!confirm(
            `「${template.title}」を削除しますか？\n`
            + '既に作成済みの案件のタスクは残ります（マスタとの紐付けだけが外れます）。',
        )) return;

        try {
            const { error } = await supabase
                .from('case_task_templates').delete().eq('id', template.id);
            if (error) throw error;
            await loadAll();
        } catch (error: any) {
            console.error('Error deleting task template:', error);
            alert(`削除に失敗しました: ${error.message}`);
        }
    };

    const handleMove = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= templates.length) return;

        const a = templates[index];
        const b = templates[target];

        try {
            await Promise.all([
                supabase.from('case_task_templates').update({ sort_order: b.sort_order }).eq('id', a.id),
                supabase.from('case_task_templates').update({ sort_order: a.sort_order }).eq('id', b.id),
            ]);
            await loadAll();
        } catch (error) {
            console.error('Error reordering task templates:', error);
            alert('並び替えに失敗しました');
        }
    };

    const toggleInArray = (list: string[], value: string): string[] =>
        list.includes(value) ? list.filter(v => v !== value) : [...list, value];

    const handleSaveUrl = async () => {
        setUrlSaving(true);
        try {
            await saveTaskSiteBaseUrl(siteBaseUrl);
            alert('喪主サイトのURLを保存しました。');
        } catch (error: any) {
            console.error('Error saving task site url:', error);
            alert(`保存に失敗しました: ${error.message}`);
        } finally {
            setUrlSaving(false);
        }
    };

    if (loading) return <div className="p-4">読み込み中...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-700">タスクマスタ管理</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        案件が受注になったとき、ここの条件に合うタスクが作られます。
                    </p>
                </div>
                <button
                    onClick={startNew}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                    <Plus size={18} />
                    新規タスク
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">喪主サイトのURL</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={siteBaseUrl}
                        onChange={e => setSiteBaseUrl(e.target.value)}
                        placeholder="https://tasks.example.com"
                        className="flex-1 p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                        onClick={handleSaveUrl}
                        disabled={urlSaving}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                        保存
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    案件画面で喪主用ログイン情報をコピーするときに、この URL が一緒に入ります。
                </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {templates.map((template, index) => (
                    <div
                        key={template.id}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 ${template.is_active ? '' : 'bg-gray-50'}`}
                    >
                        <div className="flex flex-col">
                            <button
                                onClick={() => handleMove(index, -1)}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-emerald-600 disabled:opacity-30"
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button
                                onClick={() => handleMove(index, 1)}
                                disabled={index === templates.length - 1}
                                className="text-gray-400 hover:text-emerald-600 disabled:opacity-30"
                            >
                                <ArrowDown size={14} />
                            </button>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-800">{template.title}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                    {PHASE_LABEL[template.phase]}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    {OWNER_LABEL[template.owner]}
                                </span>
                                {!template.visible_to_mourner && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                                        <EyeOff size={11} />社内のみ
                                    </span>
                                )}
                                {!template.is_active && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">無効</span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {template.code} / {describeConditions(template, items)}
                                {template.due_offset_days !== null && ` / 期日: 告別式${template.due_offset_days >= 0 ? '+' : ''}${template.due_offset_days}日`}
                                {template.auto_complete_on === 'invoice' && ' / 請求書の発行で自動完了'}
                                {template.auto_complete_on === 'receipt' && ' / 領収書の発行で自動完了'}
                                {template.initial_status === 'done' && ' / 完了状態で作成'}
                            </div>
                        </div>

                        <button
                            onClick={() => { setEditing(template); setIsNew(false); }}
                            className="p-2 text-gray-400 hover:text-emerald-600"
                            title="編集"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(template)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="削除"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {templates.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                        タスクマスタがありません。migrations/019_case_tasks.sql を実行してください。
                    </div>
                )}
            </div>

            {editing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 modal-scroll">
                        <h3 className="text-xl font-bold mb-4">{isNew ? 'タスクを追加' : 'タスクを編集'}</h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">コード</label>
                                    <input
                                        type="text"
                                        value={editing.code}
                                        onChange={e => setEditing({ ...editing, code: e.target.value })}
                                        placeholder="temple_check"
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">案件ごとの重複判定に使います。後から変えないでください。</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">項目名</label>
                                    <input
                                        type="text"
                                        value={editing.title}
                                        onChange={e => setEditing({ ...editing, title: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    説明（喪主の画面に出ます）
                                </label>
                                <textarea
                                    value={editing.description}
                                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none h-20"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">フェーズ</label>
                                    <select
                                        value={editing.phase}
                                        onChange={e => setEditing({ ...editing, phase: e.target.value as TaskPhase })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        {PHASE_ORDER.map(phase => (
                                            <option key={phase} value={phase}>{PHASE_LABEL[phase]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">担当</label>
                                    <select
                                        value={editing.owner}
                                        onChange={e => setEditing({ ...editing, owner: e.target.value as TaskOwner })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        {(Object.keys(OWNER_LABEL) as TaskOwner[]).map(owner => (
                                            <option key={owner} value={owner}>{OWNER_LABEL[owner]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        期日（告別式からの日数）
                                    </label>
                                    <input
                                        type="number"
                                        value={editing.due_offset_days ?? ''}
                                        onChange={e => setEditing({
                                            ...editing,
                                            due_offset_days: e.target.value === '' ? null : Number(e.target.value),
                                        })}
                                        placeholder="-3"
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">負の数で「何日前」。空欄は期日なし。</p>
                                </div>
                            </div>

                            {/* ---- 生成条件 ---- */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-bold text-sm text-gray-700 mb-3">生成条件</h4>
                                <p className="text-xs text-gray-500 mb-3">
                                    すべて空なら常に生成します。「オプションが選択済みかどうか」は条件に使いません
                                    （選択済み＝もう決まっている＝タスク不要、と逆になるため）。
                                </p>

                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">対象カテゴリ</label>
                                    <div className="flex gap-4">
                                        {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                                            <label key={value} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editing.target_categories.includes(value)}
                                                    onChange={() => setEditing({
                                                        ...editing,
                                                        target_categories: toggleInArray(editing.target_categories, value),
                                                    })}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        対象プラン（未選択なら全プラン）
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {plans.map(plan => (
                                            <label key={plan.id} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editing.target_plan_ids.includes(plan.id)}
                                                    onChange={() => setEditing({
                                                        ...editing,
                                                        target_plan_ids: toggleInArray(editing.target_plan_ids, plan.id),
                                                    })}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                                {plan.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">関連オプション</label>
                                    <select
                                        value={editing.related_item_id ?? ''}
                                        onChange={e => setEditing({
                                            ...editing,
                                            related_item_id: e.target.value === '' ? null : Number(e.target.value),
                                        })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="">なし</option>
                                        {items.map(item => (
                                            <option key={item.id} value={item.id}>#{item.id} {item.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        そのオプションが案件のプランで選べない場合はタスクを作りません。
                                        タスクからの画像カタログの導線にも使われます。
                                    </p>
                                </div>

                                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editing.require_flower}
                                        onChange={e => setEditing({ ...editing, require_flower: e.target.checked })}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    供花の発注受付が作られている案件だけに作る
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">帳票による自動完了</label>
                                    <select
                                        value={editing.auto_complete_on ?? ''}
                                        onChange={e => setEditing({
                                            ...editing,
                                            auto_complete_on: (e.target.value || null) as CaseTaskTemplate['auto_complete_on'],
                                        })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="">なし</option>
                                        <option value="invoice">請求書の発行で完了</option>
                                        <option value="receipt">領収書の発行で完了</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">作成時の状態</label>
                                    <select
                                        value={editing.initial_status}
                                        onChange={e => setEditing({
                                            ...editing,
                                            initial_status: e.target.value as 'todo' | 'done',
                                        })}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="todo">未着手</option>
                                        <option value="done">完了（搬送・安置など商談時点で済んでいるもの）</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editing.visible_to_mourner}
                                        onChange={e => setEditing({ ...editing, visible_to_mourner: e.target.checked })}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    喪主の画面に表示する
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editing.is_active}
                                        onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    有効にする
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => { setEditing(null); setIsNew(false); }}
                                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaseTaskTemplatesManager;
