import React from 'react';

interface Props {
    title: string;
    message: string;
}

const Notice: React.FC<Props> = ({ title, message }) => (
    <div className="notice">
        <h2>{title}</h2>
        <p>{message}</p>
    </div>
);

export default Notice;
