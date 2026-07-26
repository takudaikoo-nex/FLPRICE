import React from 'react';
import { OrderResult } from '../lib/api';
import { formatYen } from '../../lib/format';

interface Props {
    result: OrderResult;
    paymentMethod: 'card' | 'invoice';
    email: string;
}

const CompleteView: React.FC<Props> = ({ result, paymentMethod, email }) => (
    <div className="notice">
        <h2>お申し込みを承りました</h2>
        <div className="order-number">{result.order_number}</div>

        <p>
            ご注文金額は <strong>{formatYen(result.total)}</strong>（税込）です。<br />
            {email} 宛に確認のご連絡をいたします。
        </p>

        <p style={{ marginTop: 16 }}>
            {paymentMethod === 'invoice'
                ? '後日、請求書をメールにてお送りいたします。'
                : 'お支払い手続きのご案内を別途お送りいたします。'}
        </p>

        <p style={{ marginTop: 16 }}>
            この度は心よりお悔やみ申し上げます。
        </p>
    </div>
);

export default CompleteView;
