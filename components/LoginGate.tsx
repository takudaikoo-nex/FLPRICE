import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
    logoType?: 'FL' | 'LS';
    /** 画面の名前。管理画面からは「管理画面」を渡す */
    title?: string;
    /** カード下の補足。どちらのアカウントで入れるかを書く */
    note?: string;
}

/**
 * 見積システムと管理画面で共用するログイン画面。
 *
 * 同じ Supabase プロジェクトなのでアカウントは共通。
 * 以前は管理画面だけが要ログインで、画面もロジックも別物だったため
 * 「管理画面ではメールの末尾空白で入れない」「英語のエラーが出る」
 * といった差が出ていた。ここに寄せて差を無くしている。
 */
const LoginGate: React.FC<Props> = ({
    logoType = 'FL',
    title = '葬儀見積システム',
    note = '管理画面と同じアカウントでログインできます',
}) => {
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
                // コピー貼り付けで前後に空白が入りやすい。落としてから送る
                email: email.trim(),
                password,
            });

            // Supabase の生メッセージは英語なので出さない
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
                <h1 className="fl-login-title">{title}</h1>

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

                <p className="fl-note" style={{ textAlign: 'center' }}>{note}</p>
            </form>
        </div>
    );
};

export default LoginGate;
