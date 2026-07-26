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
    const client = new SMTPClient({
        connection: {
            hostname: env('SMTP_HOSTNAME'),
            port: Number(env('SMTP_PORT') || '465'),
            tls: env('SMTP_TLS') !== 'false',
            auth: {
                username: env('SMTP_USERNAME'),
                password: env('SMTP_PASSWORD'),
            },
        },
    });

    try {
        await client.send({
            from: fromName ? `${fromName} <${from}>` : from,
            to,
            subject,
            content: text,
        });
    } finally {
        await client.close();
    }
};
