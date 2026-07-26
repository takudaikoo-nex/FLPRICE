import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

/** UTF-8文字列をbase64に変換する */
const toBase64 = (text: string): string => {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
};

/**
 * 件名を RFC 2047 の encoded-word に変換する。
 *
 * denomailer は日本語の長い件名を折り返す際に encoded-word の途中で改行してしまい、
 * ヘッダー領域が壊れて件名も本文も文字化けする。
 * そのため、ここで正しい形（1つ75文字以内・継続行は先頭に空白）に組み立てる。
 * ASCIIのみの件名はそのまま返す（denomailer側もエンコードしない）。
 */
const encodeSubject = (subject: string): string => {
    if (/^[\x20-\x7E]*$/.test(subject)) return subject;

    // "=?utf-8?B?" + base64 + "?=" で75文字以内に収めるため、1語あたり45バイトまで
    const MAX_BYTES = 45;
    const encoder = new TextEncoder();
    const words: string[] = [];
    let current = '';
    let currentBytes = 0;

    // 文字単位で区切る（バイト単位で切るとマルチバイト文字が壊れるため）
    for (const char of subject) {
        const size = encoder.encode(char).length;
        if (currentBytes + size > MAX_BYTES) {
            words.push(current);
            current = '';
            currentBytes = 0;
        }
        current += char;
        currentBytes += size;
    }
    if (current) words.push(current);

    return words.map(word => `=?utf-8?B?${toBase64(word)}?=`).join('\r\n ');
};

/** 既存のメールサーバー（SMTP）経由で送信する */
export const sendMail = async (
    to: string[],
    subject: string,
    text: string,
    from: string,
    fromName: string,
): Promise<void> => {
    const hostname = env('SMTP_HOSTNAME');
    const username = env('SMTP_USERNAME');
    const password = env('SMTP_PASSWORD');

    // 未設定のまま接続すると分かりにくいエラーになるため、先に弾く
    if (!hostname || !username || !password) {
        throw new Error('smtp_not_configured');
    }

    const client = new SMTPClient({
        connection: {
            hostname,
            port: Number(env('SMTP_PORT') || '465'),
            tls: env('SMTP_TLS') !== 'false',
            auth: { username, password },
        },
    });

    try {
        // 接続できないポートを指定した場合、応答が返らず関数ごとタイムアウトしてしまう。
        // ブラウザ側にはCORSエラーとして見えて原因が分からなくなるため、
        // ここで打ち切って明確なエラーを返す。
        await Promise.race([
            client.send({
                from: fromName ? `${fromName} <${from}>` : from,
                to,
                subject: encodeSubject(subject),
                // SMTPは改行がCRLFである前提のため揃えておく
                content: text.replace(/\r?\n/g, '\r\n'),
            }),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error(`smtp_timeout: ${hostname}:${env('SMTP_PORT') || '465'} に接続できませんでした`)),
                    20000,
                )
            ),
        ]);
    } catch (error) {
        console.error('SMTP send failed:', error);
        throw error;
    } finally {
        // 接続が確立していない場合 close() 自体が例外を投げ、
        // 本来のエラーを覆い隠してしまうため個別に握りつぶす
        try {
            await client.close();
        } catch (closeError) {
            console.error('SMTP close failed (ignored):', closeError);
        }
    }
};
