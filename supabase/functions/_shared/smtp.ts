import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

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
                subject,
                content: text,
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
