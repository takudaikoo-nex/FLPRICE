import React from 'react';
import { Users, PlusCircle, Search, Settings, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TopScreenProps {
    logoType: 'FL' | 'LS';
    onToggleLogo: () => void;
    onCustomerList: () => void;
    onCreateNew: () => void;
    onSearch: () => void;
}

const TopScreen: React.FC<TopScreenProps> = ({
    logoType, onToggleLogo, onCustomerList, onCreateNew, onSearch,
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
        </div>
    );
};

export default TopScreen;
