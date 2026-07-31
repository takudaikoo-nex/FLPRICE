import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

/**
 * denomailer がヘッダーをエンコードしたときの文字数を数える。
 *
 * denomailer は件名や差出人名を `=?utf-8?Q?...?=` に変換し、
 * 中身が74文字を超えると `=\r\n` で折り返す。これは本文用の折り返し方式で、
 * ヘッダー（encoded-word）の中では規約違反となり、受信側は
 * ヘッダーが終わったと解釈して以降を本文として表示してしまう。
 *
 * また `=?` で始まる文字列は再度エンコードされるため、
 * 呼び出し側で先にエンコードしておくことはできない。
 * 収まる長さに保つことが唯一の対処になる。
 *
 * 日本語は1文字＝3バイト＝9文字に膨らむ点に注意（＝8文字までしか入らない）。
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

/** 折り返しが起きない長さまでヘッダーの文字列を切り詰める */
export const fitHeaderText = (text: string): string => {
    if (encodedLength(text) <= QP_HEADER_LIMIT) return text;

    let result = '';
    for (const char of text) {
        if (encodedLength(result + char + '…') > QP_HEADER_LIMIT) break;
        result += char;
    }
    return result + '…';
};

/**
 * 差出人名を上限に収める。
 *
 * ここが溢れると From ヘッダーが行の途中で切れ、送信側のMTAが
 * 尻切れの部分をアドレスと誤認してドメインを付け足してしまう。
 * 結果として From のドメインが変わり、DMARC が失敗する。
 *
 * 「ファーストリーフ 大石康太」のように空白で区切られている場合は、
 * 末尾を「…」で削るより前半（＝社名）だけを残すほうが自然に読める。
 */
export const fitFromName = (name: string): string => {
    // `<` `>` `,` `"` は宛先の区切りとして解釈されてしまうので落とす
    const cleaned = name.replace(/[<>,"]/g, '').trim();
    if (encodedLength(cleaned) <= QP_HEADER_LIMIT) return cleaned;

    for (const part of cleaned.split(/[\s　]+/)) {
        if (part && encodedLength(part) <= QP_HEADER_LIMIT) return part;
    }
    return fitHeaderText(cleaned);
};

/**
 * 本文をbase64に変換し、76文字ごとに改行する（RFC 2045）。
 *
 * denomailer の quotedPrintableEncode は74文字ごとに折り返す際、
 * 多バイト文字の途中で切れた分を次の行へ送る調整をしているが、
 * 最後のかたまりだけその調整が反映されず、末尾付近の文字が脱落する。
 *
 * mimeContent で渡した内容はこのエンコーダを通らないため、
 * 自前でbase64に変換して渡すことで回避する。
 */
export const toBase64Body = (text: string): string => {
    // SMTPは改行がCRLFである前提
    const normalized = text.replace(/\r?\n/g, '\r\n');
    const bytes = new TextEncoder().encode(normalized);

    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);

    const encoded = btoa(binary);
    return (encoded.match(/.{1,76}/g) ?? []).join('\r\n');
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

    const safeFromName = fitFromName(fromName);

    try {
        // 接続できないポートを指定した場合、応答が返らず関数ごとタイムアウトしてしまう。
        // ブラウザ側にはCORSエラーとして見えて原因が分からなくなるため、
        // ここで打ち切って明確なエラーを返す。
        await Promise.race([
            client.send({
                from: safeFromName ? `${safeFromName} <${from}>` : from,
                to,
                subject: fitHeaderText(subject),
                mimeContent: [{
                    mimeType: 'text/plain; charset="utf-8"',
                    content: toBase64Body(text),
                    transferEncoding: 'base64',
                }],
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
