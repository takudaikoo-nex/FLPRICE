import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';

const BackupManager: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackupDownload = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const [plansResult, itemsResult] = await Promise.all([
                supabase.from('plans').select('*').order('id'),
                supabase.from('items').select('*').order('display_order')
            ]);

            if (plansResult.error) throw plansResult.error;
            if (itemsResult.error) throw itemsResult.error;

            const backupData = {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                plans: plansResult.data,
                items: itemsResult.data
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Format date for filename
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `fl_db_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setMessage({ type: 'success', text: 'バックアップのダウンロードが完了しました。' });
        } catch (error: any) {
            console.error('Backup error:', error);
            setMessage({ type: 'error', text: `バックアップ失敗: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreClick = () => {
        if (!confirm('【警告】現在のデータベースの内容はすべて、アップロードするバックアップファイルの内容で上書きされます。\n\n本当にリストア（復元）処理を開始してもよろしいですか？')) {
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMessage(null);

        try {
            const text = await file.text();
            let backupData;
            try {
                backupData = JSON.parse(text);
            } catch (e) {
                throw new Error('無効なJSONファイルです。');
            }

            if (!backupData.plans || !backupData.items) {
                throw new Error('バックアップファイルの形式が正しくありません。（plansとitemsが必要です）');
            }

            // Delete existing
            const { error: delItemsErr } = await supabase.from('items').delete().neq('id', 0);
            if (delItemsErr) throw delItemsErr;
            const { error: delPlansErr } = await supabase.from('plans').delete().neq('id', 'dummy');
            if (delPlansErr) throw delPlansErr;

            // Insert backup
            if (backupData.plans.length > 0) {
                const { error: insPlansErr } = await supabase.from('plans').insert(backupData.plans);
                if (insPlansErr) throw insPlansErr;
            }
            if (backupData.items.length > 0) {
                const { error: insItemsErr } = await supabase.from('items').insert(backupData.items);
                if (insItemsErr) throw insItemsErr;
            }

            setMessage({ type: 'success', text: 'データベースのリストア（復元）が正常に完了しました！' });
        } catch (error: any) {
            console.error('Restore error:', error);
            setMessage({ type: 'error', text: `リストアに失敗しました: ${error.message}` });
        } finally {
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="max-w-3xl">
            <h3 className="text-lg font-bold text-gray-700 mb-6">バックアップ・復元</h3>

            {message && (
                <div className={`p-4 rounded-lg flex items-start gap-3 mb-6 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 className="mt-0.5 shrink-0" size={18} /> : <AlertTriangle className="mt-0.5 shrink-0" size={18} />}
                    <div>
                        <p className="font-bold">{message.type === 'success' ? '成功' : 'エラー'}</p>
                        <p className="text-sm mt-1">{message.text}</p>
                    </div>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                        <Download size={24} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-800">バックアップをダウンロード</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                            現在のすべての「プラン」と「アイテム」の情報を1つのファイル（JSON形式）としてお使いのパソコンに保存します。定期的にダウンロードしておくことをお勧めします。
                        </p>
                        <button
                            onClick={handleBackupDownload}
                            disabled={loading}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? '処理中...' : 'バックアップファイルを保存する (.json)'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-full">
                        <Upload size={24} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-800 text-red-700">バックアップから復元 (リストア)</h4>
                        <p className="text-sm text-gray-600 mt-1 mb-4">
                            過去にダウンロードしたバックアップファイル（JSON）を読み込み、データベースを当時の状態に巻き戻します。<br/>
                            <span className="font-bold text-red-600">※現在データベースに登録されている情報はすべて上書き消去されます。</span>
                        </p>
                        <input 
                            type="file" 
                            accept=".json,application/json" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                            className="hidden" 
                        />
                        <button
                            onClick={handleRestoreClick}
                            disabled={loading}
                            className="bg-white border-2 border-red-200 text-red-600 px-5 py-2.5 rounded-lg font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                            {loading ? '処理中...' : 'ファイルを選択して復元する'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupManager;
