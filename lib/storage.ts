import { supabase } from './supabase';
import { compressImage } from './imageCompress';

export const FLOWER_IMAGE_BUCKET = 'flower-images';
export const ITEM_IMAGE_BUCKET = 'item-images';

/** ランダムなファイル名（crypto が使えない環境ではフォールバック） */
const randomFileName = (ext: string): string => {
    const bytes = new Uint8Array(12);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex}.${ext}`;
};

/**
 * Storage のパスから公開URLを取得。
 * すでにURL形式のもの（デモ用のローカル画像など）はそのまま返す。
 */
export const storageImageUrl = (bucket: string, path: string): string => {
    if (/^(https?:|data:|\/)/.test(path)) return path;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

/**
 * 画像を圧縮してアップロードし、保存されたパスを返す。
 * 圧縮はブラウザ側で行うため、アップロード後のサイズはおおむね200〜400KBに収まる。
 */
export const uploadImage = async (bucket: string, file: File): Promise<string> => {
    const compressed = await compressImage(file);
    const ext = compressed.type === 'image/jpeg'
        ? 'jpg'
        : (compressed.name.split('.').pop()?.toLowerCase() || 'jpg');

    const path = randomFileName(ext);

    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, compressed, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    return path;
};

/** 複数ファイルをまとめてアップロードする */
export const uploadImages = async (bucket: string, files: File[]): Promise<string[]> => {
    const paths: string[] = [];
    for (const file of files) {
        paths.push(await uploadImage(bucket, file));
    }
    return paths;
};

export const removeImages = async (bucket: string, paths: string[]): Promise<void> => {
    const stored = paths.filter(path => !/^(https?:|data:|\/)/.test(path));
    if (stored.length === 0) return;
    await supabase.storage.from(bucket).remove(stored);
};
