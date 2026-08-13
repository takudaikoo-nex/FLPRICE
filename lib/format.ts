// ================================================
// 表示用の整形ユーティリティ
//
// 供花の公開サイトからも読み込むため、
// このファイルは Supabase クライアントに依存させないこと。
// ================================================

export const formatYen = (value: number): string => `¥${value.toLocaleString()}`;

/**
 * 2026/07/26 14:30 形式。日本時間（+09:00）で表示する。
 *
 * 告別式や受付締切の時刻は、閲覧者の端末の時差に関係なく
 * 常に日本時間で示す必要があるため、固定で9時間足して扱う。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—';
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) return '—';

    const d = new Date(parsed.getTime() + JST_OFFSET_MS);
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

/** ISO文字列 → <input type="datetime-local"> の値（ローカル時刻） */
export const toDatetimeLocal = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** <input type="datetime-local"> の値 → ISO文字列 */
export const fromDatetimeLocal = (value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
};

/** 受付中かどうか（受付フラグ・締切の両方を見る） */
export const isAcceptingOrders = (isOpen: boolean, deadline: string | null): boolean => {
    if (!isOpen) return false;
    if (!deadline) return true;
    return new Date(deadline).getTime() > Date.now();
};

/** CSV文字列を生成（Excelで開けるようBOM付き） */
export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const escape = (v: string | number) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = rows.map(r => r.map(escape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * 氏名の末尾に付いた敬称を落とす。
 * 「様」を含んだまま登録すると、表示側でも「様」を付けるため二重になり、
 * 同じご葬家が別の顧客として重複してしまう。
 *
 *   「山田 太郎 様」→「山田 太郎」
 *   「山田 太郎 様 様」→「山田 太郎」
 */
export const stripHonorific = (name: string): string => {
    let result = (name ?? '').trim();

    // 間の空白ごと、末尾から繰り返し落とす
    const honorific = /[\s　]*(様|さま|サマ|ｻﾏ)$/;
    while (honorific.test(result)) {
        result = result.replace(honorific, '').trimEnd();
    }
    return result;
};
