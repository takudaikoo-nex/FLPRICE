import { supabase } from './supabase';

export const FLOWER_IMAGE_BUCKET = 'flower-images';

/**
 * Storage のパスから公開URLを取得。
 * デモ用のローカル画像やデータURIはそのまま返す。
 */
export const flowerImageUrl = (path: string): string => {
    if (/^(https?:|data:|\/)/.test(path)) return path;
    return supabase.storage.from(FLOWER_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
};

/** ランダムな16進文字列（crypto が使えない環境ではフォールバック） */
const randomHex = (byteLength: number): string => {
    const bytes = new Uint8Array(byteLength);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

/** 発注URL用の推測不可能なトークンを生成 */
export const generatePublicToken = (): string => randomHex(16);

/** 画像アップロード用のファイル名を生成 */
export const randomImageFileName = (ext: string): string => `${randomHex(12)}.${ext}`;

/** 告別式日時から受付締切を自動計算 */
export const calcOrderDeadline = (ceremonyAt: string | null, hoursBefore: number): string | null => {
    if (!ceremonyAt) return null;
    const date = new Date(ceremonyAt);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getTime() - hoursBefore * 60 * 60 * 1000).toISOString();
};

/** 発注ページのURLを組み立てる */
export const buildOrderUrl = (baseUrl: string, token: string): string => {
    const base = (baseUrl || '').replace(/\/+$/, '');
    return `${base}/order/${token}`;
};

/** 2026/07/26 14:30 形式 */
export const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
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

export const formatYen = (value: number): string => `¥${value.toLocaleString()}`;

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
