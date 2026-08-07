import React, { useState } from 'react';
import { CaseSummary, Role, login, toUserMessage } from '../lib/api';

interface Props {
    onLoggedIn: (token: string, role: Role, caseSummary: CaseSummary | null) => void;
}

const LoginView: React.FC<Props> = ({ onLoggedIn }) => {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const result = await login(loginId.trim(), password);
            onLoggedIn(result.token, result.role, result.case);
        } catch (err) {
            setError(toUserMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-shell">
            <form className="login-card" onSubmit={handleSubmit}>
                <p className="brand">FIRST LEAF</p>
                <h1>ご葬儀の進捗確認</h1>
                <p className="lead">ご案内した ID とパスワードでお入りください</p>

                <div className="field">
                    <label htmlFor="login-id">ID</label>
                    <input
                        id="login-id"
                        type="text"
                        value={loginId}
                        onChange={e => setLoginId(e.target.value)}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        required
                        autoFocus
                    />
                </div>

                <div className="field">
                    <label htmlFor="login-password">パスワード</label>
                    <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </div>

                {error && <p className="error">{error}</p>}

                <button type="submit" className="btn" disabled={submitting}>
                    {submitting ? 'ログイン中...' : 'ログイン'}
                </button>

                <p className="hint">
                    ご不明な場合は担当者までお問い合わせください<br />
                    <a href="tel:0467385617">0467-38-5617</a>（9:00〜18:00）
                </p>
            </form>
        </div>
    );
};

export default LoginView;
