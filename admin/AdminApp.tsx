import React, { useState } from 'react';
import LoginGate from '../components/LoginGate';
import { useSupabaseSession, confirmSignOut } from '../hooks/useSupabaseSession';
import PlansManager from './components/PlansManager';
import ItemsManager from './components/ItemsManager';
import AttendeesManager from './components/AttendeesManager';
import { LogOut, LayoutDashboard, List, Users, DatabaseBackup, Flower2, Settings, ListChecks, Images } from 'lucide-react';
import BackupManager from './components/BackupManager';
import CatalogProductsManager from './components/CatalogProductsManager';
import FlowerProductsManager from './components/FlowerProductsManager';
import FlowerSettingsManager from './components/FlowerSettingsManager';
import CaseTaskTemplatesManager from './components/CaseTaskTemplatesManager';

type AdminTab = 'plans' | 'items' | 'catalogProducts' | 'attendees' | 'backup' | 'taskTemplates' | 'flowerProducts' | 'flowerSettings';

const AdminApp: React.FC = () => {
    // ログイン状態は見積システムと同じフックで扱う
    const { session, loading } = useSupabaseSession();
    const [activeTab, setActiveTab] = useState<AdminTab>('plans');

    const handleLogout = () => { void confirmSignOut(); };

    if (loading) {
        return <div className="fl-shell"><div className="fl-empty">読み込み中...</div></div>;
    }

    if (!session) {
        return (
            <LoginGate
                title="管理画面"
                note="見積システムと同じアカウントでログインできます"
            />
        );
    }

    return (
        <div className="admin-scope h-screen bg-gray-100 flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
                        <LayoutDashboard size={24} />
                        FL 管理画面
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">{session.user.email}</p>
                </div>

                <nav className="p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'plans'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <LayoutDashboard size={20} />
                        プラン管理
                    </button>

                    <button
                        onClick={() => setActiveTab('items')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'items'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <List size={20} />
                        アイテム管理
                    </button>

                    <button
                        onClick={() => setActiveTab('catalogProducts')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'catalogProducts'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Images size={20} />
                        商品マスタ
                    </button>

                    <button
                        onClick={() => setActiveTab('attendees')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'attendees'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Users size={20} />
                        参列人数設定
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'backup'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <DatabaseBackup size={20} />
                        バックアップ設定
                    </button>

                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <p className="px-4 mb-2 text-xs text-gray-400">進行管理</p>

                        <button
                            onClick={() => setActiveTab('taskTemplates')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'taskTemplates'
                                ? 'bg-emerald-50 text-emerald-700 font-bold'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <ListChecks size={20} />
                            タスクマスタ管理
                        </button>
                    </div>

                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <p className="px-4 mb-2 text-xs text-gray-400">供花発注</p>

                        <button
                            onClick={() => setActiveTab('flowerProducts')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'flowerProducts'
                                ? 'bg-emerald-50 text-emerald-700 font-bold'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Flower2 size={20} />
                            供花商品管理
                        </button>

                        <button
                            onClick={() => setActiveTab('flowerSettings')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'flowerSettings'
                                ? 'bg-emerald-50 text-emerald-700 font-bold'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Settings size={20} />
                            供花の設定
                        </button>
                    </div>
                </nav>

                <div className="mt-auto p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        ログアウト
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto min-h-0">
                <div className="max-w-5xl mx-auto">
                    {activeTab === 'plans' && (
                        <PlansManager />
                    )}

                    {activeTab === 'items' && (
                        <ItemsManager />
                    )}

                    {activeTab === 'catalogProducts' && (
                        <CatalogProductsManager />
                    )}

                    {activeTab === 'attendees' && (
                        <AttendeesManager />
                    )}

                    {activeTab === 'backup' && (
                        <BackupManager />
                    )}

                    {activeTab === 'taskTemplates' && (
                        <CaseTaskTemplatesManager />
                    )}

                    {activeTab === 'flowerProducts' && (
                        <FlowerProductsManager />
                    )}

                    {activeTab === 'flowerSettings' && (
                        <FlowerSettingsManager />
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminApp;
