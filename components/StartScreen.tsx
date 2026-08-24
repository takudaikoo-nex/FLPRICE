import React, { useState } from 'react';
import { FileSearch, PlusCircle, ArrowRight, Loader2 } from 'lucide-react';

interface StartScreenProps {
    onLoad: (id: string) => Promise<void>;
    onCreateNew: () => void;
    logoType: 'FL' | 'LS';
    onToggleLogo: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onLoad, onCreateNew, logoType, onToggleLogo }) => {
    const [loadId, setLoadId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLoadClick = async () => {
        if (!loadId.trim()) return;
        setIsLoading(true);
        try {
            await onLoad(loadId);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fl-shell fl-login-shell">
            <div className="fl-login-card" style={{ maxWidth: '420px' }}>
                <img
                    src={`/images/logo${logoType}.png`}
                    alt="Logo"
                    className="fl-login-logo"
                    onClick={onToggleLogo}
                    style={{ cursor: 'pointer' }}
                    title="クリックでロゴ切替"
                />
                <h1 className="fl-login-title">葬儀プラン・見積り作成</h1>
                <p className="fl-note">簡単操作で素早くお見積りを作成・印刷</p>

                <div className="fl-field" style={{ marginTop: '24px' }}>
                    <label>
                        <FileSearch size={15} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                        続きから作成（読込）
                    </label>
                    <div className="fl-start-load">
                        <input
                            type="number"
                            pattern="\d*"
                            value={loadId}
                            onChange={(e) => setLoadId(e.target.value)}
                            placeholder="見積番号（例: 1024）"
                            onKeyDown={(e) => e.key === 'Enter' && handleLoadClick()}
                        />
                        <button
                            type="button"
                            className="fl-btn fl-btn-primary"
                            onClick={handleLoadClick}
                            disabled={isLoading || !loadId}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                        </button>
                    </div>
                </div>

                <p className="fl-start-divider">または</p>

                <button type="button" className="fl-start-new" onClick={onCreateNew}>
                    <PlusCircle size={18} />
                    新規作成する
                </button>

                <p className="fl-note" style={{ marginTop: '20px' }}>© First Leaf 葬儀見積システム</p>
            </div>
        </div>
    );
};

export default StartScreen;
