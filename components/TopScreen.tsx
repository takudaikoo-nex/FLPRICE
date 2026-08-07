import React from 'react';
import { Users, PlusCircle, Search, Settings, LogOut, Link2, ClipboardList, Images, ListChecks } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TopScreenProps {
    logoType: 'FL' | 'LS';
    onToggleLogo: () => void;
    onCustomerList: () => void;
    onCreateNew: () => void;
    onSearch: () => void;
    onFlowerFunerals: () => void;
    onFlowerOrders: () => void;
    onCaseTasks: () => void;
}

const TopScreen: React.FC<TopScreenProps> = ({
    logoType, onToggleLogo, onCustomerList, onCreateNew, onSearch,
    onFlowerFunerals, onFlowerOrders, onCaseTasks,
}) => {
    const handleSettings = () => {
        window.open('/admin/', '_blank');
    };

    const handleLogout = async () => {
        if (!confirm('ログアウトしますか？')) return;
        await supabase.auth.signOut();
        alert('ログアウトしました。');
    };

    return (
        <div className="fl-shell">
            <header className="fl-header">
                <div className="fl-header-left">
                    <img
                        src={`/images/logo${logoType}.png`}
                        alt="Logo"
                        onClick={onToggleLogo}
                        style={{ cursor: 'pointer' }}
                        title="クリックでロゴ切替"
                    />
                    <h1>葬儀見積システム</h1>
                </div>

                <div className="fl-header-actions">
                    <button type="button" className="fl-header-btn" onClick={handleSettings}>
                        <Settings size={16} />
                        設定
                    </button>
                    <button type="button" className="fl-header-btn is-danger" onClick={handleLogout}>
                        <LogOut size={16} />
                        ログアウト
                    </button>
                </div>
            </header>

            <main className="fl-main">
                <div className="fl-tiles">
                    <button type="button" className="fl-tile" onClick={onCustomerList}>
                        <span className="fl-tile-icon"><Users size={34} /></span>
                        <span className="fl-tile-label">顧客一覧</span>
                        <span className="fl-tile-desc">顧客ごとに見積を確認する</span>
                    </button>

                    <button type="button" className="fl-tile" onClick={onCreateNew}>
                        <span className="fl-tile-icon"><PlusCircle size={34} /></span>
                        <span className="fl-tile-label">見積作成</span>
                        <span className="fl-tile-desc">新しい見積を作成する</span>
                    </button>

                    <button type="button" className="fl-tile" onClick={onSearch}>
                        <span className="fl-tile-icon"><Search size={34} /></span>
                        <span className="fl-tile-label">検索</span>
                        <span className="fl-tile-desc">見積番号・氏名から探す</span>
                    </button>
                </div>
            </main>

            <section className="fl-subsection">
                <h2 className="fl-subsection-title">進行管理</h2>
                <div className="fl-subtiles">
                    <button type="button" className="fl-subtile" onClick={onCaseTasks}>
                        <span className="fl-subtile-icon"><ListChecks size={22} /></span>
                        <span>
                            <span className="fl-subtile-label">タスク進捗</span>
                            <span className="fl-subtile-desc">案件ごとのやることと進み具合を確認する</span>
                        </span>
                    </button>
                </div>
            </section>

            <section className="fl-subsection">
                <h2 className="fl-subsection-title">オプション</h2>
                <div className="fl-subtiles">
                    <button
                        type="button"
                        className="fl-subtile"
                        onClick={() => window.open('/?catalog=true', '_blank')}
                    >
                        <span className="fl-subtile-icon"><Images size={22} /></span>
                        <span>
                            <span className="fl-subtile-label">オプション画像カタログ</span>
                            <span className="fl-subtile-desc">別タブで開き、お客様にお見せする</span>
                        </span>
                    </button>
                </div>
            </section>

            <section className="fl-subsection">
                <h2 className="fl-subsection-title">供花発注</h2>
                <div className="fl-subtiles">
                    <button type="button" className="fl-subtile" onClick={onFlowerFunerals}>
                        <span className="fl-subtile-icon"><Link2 size={22} /></span>
                        <span>
                            <span className="fl-subtile-label">発注URL発行</span>
                            <span className="fl-subtile-desc">葬儀ごとに供花の発注URLを発行する</span>
                        </span>
                    </button>

                    <button type="button" className="fl-subtile" onClick={onFlowerOrders}>
                        <span className="fl-subtile-icon"><ClipboardList size={22} /></span>
                        <span>
                            <span className="fl-subtile-label">発注者一覧</span>
                            <span className="fl-subtile-desc">供花の申し込み状況を確認する</span>
                        </span>
                    </button>
                </div>
            </section>
        </div>
    );
};

export default TopScreen;
