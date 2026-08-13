import React, { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { formatYen } from '../../lib/format';

interface Props {
    clientSecret: string;
    publishableKey: string;
    total: number;
    orderNumber: string;
    onPaid: () => void;
}

/**
 * カード情報の入力欄。
 * カード番号は Stripe の iframe の中だけを通り、このサイトには渡らない。
 */
const PaymentForm: React.FC<{ total: number; onPaid: () => void }> = ({ total, onPaid }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) return;

        setSubmitting(true);
        setError('');

        // カードのみを受け付けているため通常は遷移しない。
        // 3Dセキュアが必要な場合だけ Stripe がモーダルを出す。
        const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required',
        });

        if (stripeError) {
            setError(stripeError.message || 'カードの処理に失敗しました。内容をご確認ください。');
            setSubmitting(false);
            return;
        }

        if (paymentIntent?.status === 'succeeded') {
            onPaid();
            return;
        }

        // 与信のみ通って確定待ちになるケース。注文は成立しているので完了として扱う
        if (paymentIntent?.status === 'processing') {
            onPaid();
            return;
        }

        setError('決済が完了しませんでした。恐れ入りますが、もう一度お試しください。');
        setSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-card">
                <PaymentElement options={{ layout: 'tabs' }} />
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="btn-row">
                <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={!stripe || submitting}
                >
                    {submitting ? '処理中...' : `${formatYen(total)} を支払う`}
                </button>
            </div>

            <p className="hint" style={{ marginTop: 12 }}>
                ※ カード情報は決済代行会社（Stripe）に直接送信され、当サイトには保存されません。
            </p>
        </form>
    );
};

const PaymentView: React.FC<Props> = ({ clientSecret, publishableKey, total, orderNumber, onPaid }) => {
    // loadStripe は同じキーで1回だけ呼ぶ（毎描画で呼ぶと二重に読み込まれる）
    const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

    return (
        <div className="section">
            <h2 className="section-title">お支払い</h2>

            <div className="form-card">
                <p>注文番号: <strong>{orderNumber}</strong></p>
                <p style={{ marginTop: 8 }}>
                    お支払金額: <strong>{formatYen(total)}</strong>（税込）
                </p>
                <p className="hint" style={{ marginTop: 8 }}>
                    ご注文はまだ確定していません。カード情報をご入力のうえ、お支払いをお願いいたします。
                </p>
            </div>

            <Elements
                stripe={stripePromise}
                options={{ clientSecret, locale: 'ja' }}
            >
                <PaymentForm total={total} onPaid={onPaid} />
            </Elements>
        </div>
    );
};

export default PaymentView;
