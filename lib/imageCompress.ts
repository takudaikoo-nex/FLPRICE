// ================================================
// 画像のリサイズ・圧縮
//
// アップロード前にブラウザ側で処理する。
// 生成AIやスマホの写真はそのままだと数MBあり、
// 発注サイトをスマホで開いたときの表示が重くなるため。
// ================================================

export interface CompressOptions {
    /** 長辺の最大ピクセル数 */
    maxSize?: number;
    /** JPEGの品質（0〜1） */
    quality?: number;
}

const DEFAULT_MAX_SIZE = 1400;
const DEFAULT_QUALITY = 0.82;

const loadImage = (file: File): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('画像を読み込めませんでした'));
        };
        image.src = url;
    });

/**
 * 画像を縮小してJPEGに変換する。
 * 変換できない形式（SVGなど）や、すでに十分小さい場合は元のファイルを返す。
 */
export const compressImage = async (
    file: File,
    options: CompressOptions = {},
): Promise<File> => {
    const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
    const quality = options.quality ?? DEFAULT_QUALITY;

    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        return file;
    }

    try {
        const image = await loadImage(file);
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));

        // 縮小の必要が無く、もともと軽い場合はそのまま使う
        if (scale === 1 && file.size <= 400 * 1024) {
            return file;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');
        if (!context) return file;

        // JPEGは透過を表現できないため、背景を白で塗ってから描画する
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', quality),
        );

        if (!blob || blob.size >= file.size) return file;

        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], name, { type: 'image/jpeg' });
    } catch (error) {
        console.error('Failed to compress image, uploading the original:', error);
        return file;
    }
};
