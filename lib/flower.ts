import { supabase } from './supabase';

export const FLOWER_IMAGE_BUCKET = 'flower-images';

// 表示用の整形関数は Supabase 非依存の format.ts に置いている。
// 既存の呼び出し元のためにここから再エクスポートする。
export {
    formatYen, formatDateTime, toDatetimeLocal, fromDatetimeLocal,
    isAcceptingOrders, downloadCsv,
} from './format';

/**
 * Storage のパスから公開URLを取得。
 * すでにURL形式のもの（デモ用のローカル画像など）はそのまま返す。
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
