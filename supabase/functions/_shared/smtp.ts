import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

/**
 * denomailer が件名をエンコードしたときの文字数を数える。
 *
 * denomailer は件名を `=?utf-8?Q?...?=` に変換し、中身が74文字を超えると
 * `=\r\n` で折り返す。これは本文用の折り返し方式で、件名（encoded-word）の
 * 中では規約違反となり、受信側はヘッダーが終わったと解釈して
 * 以降を本文として表示してしまう。
 *
 * また `=?` で始まる文字列は再度エンコードされるため、
 * 呼び出し側で先にエンコードしておくことはできない。
 * 収まる長さに保つことが唯一の対処になる。
 *
 * 日本語は1文字＝3バイト＝9文字に膨らむ点に注意。
 */
const QP_HEADER_LIMIT = 74;

const encodedLength = (text: string): number => {
    const encoder = new TextEncoder();
    let length = 0;

    for (const char of text) {
        const bytes = encoder.encode(char);
        // 印字可能ASCII（"=" を除く）とタブはそのまま1文字
        if (bytes.length === 1) {
            const code = bytes[0];
            if ((code >= 32 && code <= 126 && code !== 61) || code === 9) {
                length += 1;
                continue;
            }
        }
        // それ以外は1バイトにつき "=XX" の3文字
        length += bytes.length * 3;
    }

    return length;
};

/** 折り返しが起きない長さまで件名を切り詰める */
export const fitSubject = (subject: string): string => {
    if (encodedLength(subject) <= QP_HEADER_LIMIT) return subject;

    let result = '';
    for (const char of subject) {
        if (encodedLength(result + char + '…') > QP_HEADER_LIMIT) break;
        result += char;
    }
    return result + '…';
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
                subject: fitSubject(subject),
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
