import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
    logoType: 'FL' | 'LS';
}

/**
 * 見積システムのログイン画面。
 * 管理画面（/admin）と同じSupabase認証を使うため、
 * どちらかでログインすれば両方使える。
 */
const LoginGate: React.FC<Props> = ({ logoType }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                setError('メールアドレスまたはパスワードが正しくありません。');
            }
            // 成功時は onAuthStateChange で画面が切り替わる
        } catch (err) {
            console.error('Login failed:', err);
            setError('ログインに失敗しました。通信環境をご確認ください。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fl-shell fl-login-shell">
            <form className="fl-login-card" onSubmit={handleLogin}>
                <img src={`/images/logo${logoType}.png`} alt="Logo" className="fl-login-logo" />
                <h1 className="fl-login-title">葬儀見積システム</h1>

                <div className="fl-field">
                    <label htmlFor="login-email">メールアドレス</label>
                    <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="username"
                        required
                        autoFocus
                    />
                </div>

                <div className="fl-field">
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

                {error && <p className="fl-error">{error}</p>}

                <button
                    type="submit"
                    className="fl-btn fl-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                    disabled={loading}
                >
                    <LogIn size={16} />
                    {loading ? 'ログイン中...' : 'ログイン'}
                </button>

                <p className="fl-note" style={{ textAlign: 'center' }}>
                    管理画面と同じアカウントでログインできます
                </p>
            </form>
        </div>
    );
};

export default LoginGate;
