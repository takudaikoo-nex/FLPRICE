import React from 'react';
import { FuneralPublic } from '../lib/api';
import { formatDateTime } from '../../lib/flower';

interface Props {
    funeral: FuneralPublic;
}

const FuneralHeader: React.FC<Props> = ({ funeral }) => (
    <div className="funeral-card">
        <div className="deceased">故 {funeral.deceased_name} 様</div>

        <dl className="funeral-meta">
            {funeral.chief_mourner_name && (
                <div><dt>喪主</dt><dd>{funeral.chief_mourner_name} 様</dd></div>
            )}
            {funeral.venue_name && (
                <div>
                    <dt>式場</dt>
                    <dd>
                        {funeral.venue_name}
                        {funeral.venue_address && <div className="hint">{funeral.venue_address}</div>}
                    </dd>
                </div>
            )}
            {funeral.wake_at && (
                <div><dt>通夜</dt><dd>{formatDateTime(funeral.wake_at)}</dd></div>
            )}
            {funeral.ceremony_at && (
                <div><dt>告別式</dt><dd>{formatDateTime(funeral.ceremony_at)}</dd></div>
            )}
        </dl>

        {funeral.order_deadline && (
            <p className="deadline-note">
                お申し込みの受付は <strong>{formatDateTime(funeral.order_deadline)}</strong> までとなります。
            </p>
        )}
    </div>
);

export default FuneralHeader;
