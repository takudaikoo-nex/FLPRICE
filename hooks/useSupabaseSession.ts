import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * ログイン状態の取得。見積システムと管理画面で同じものを使う。
 *
 * どちらも同じ Supabase プロジェクトを見ているため、
 * 片方でログインすればもう片方もそのまま入れる。
 *
 * loading が true の間は「未ログイン」と区別できない。
 * ここを見ずに session だけで判定すると、
 * 復元が終わる前に一瞬ログイン画面が出てしまう。
 */
export function useSupabaseSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
            setSession(next);
        });

        return () => subscription.unsubscribe();
    }, []);

    return { session, loading };
}

/**
 * 端末に残っているログイン情報を消す。
 *
 * supabase-js は localStorage の sb-<プロジェクト>-auth-token に保存している。
 * キー名はプロジェクトごとに変わるので、前方一致で拾う。
 */
function clearStoredSession(): void {
    for (const key of Object.keys(window.localStorage)) {
        if (/^sb-.+-auth-token/.test(key)) window.localStorage.removeItem(key);
    }
}

/**
 * ログアウト。確認を取ってから実行する。画面の切り替えは onAuthStateChange に任せる。
 *
 * signOut() はサーバーへの通信が失敗すると、手元のセッションを消さずに戻る
 * （@supabase/auth-js の _signOut）。その場合 onAuthStateChange も飛ばないため、
 * 何も言わずに終えると「ログアウトしたのにログイン状態のまま」になる。
 * 端末側のログイン情報だけは必ず消し、他の端末が残ることを伝える。
 */
export async function confirmSignOut(): Promise<boolean> {
    if (!window.confirm('ログアウトしますか？')) return false;

    const { error } = await supabase.auth.signOut();
    if (!error) return true;

    console.error('Sign out failed:', error);
    clearStoredSession();
    window.alert(
        'サーバーとの通信に失敗しました。この端末のログインは解除しますが、'
        + '他の端末やブラウザはログインしたままです。'
    );
    // セッションはメモリにも残っているので、読み直してログイン画面に戻す
    window.location.reload();
    return true;
}
