import React, { useState } from 'react';

export const MoneyInput: React.FC<{ value: number; onChange: (v: number) => void; className?: string }> = ({ value, onChange, className }) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');

  const handleFocus = () => {
    setEditing(true);
    setRaw(value ? String(value) : '');
  };
  const handleBlur = () => {
    setEditing(false);
    const parsed = parseInt(raw.replace(/,/g, ''));
    onChange(isNaN(parsed) ? 0 : parsed);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRaw(val.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, ''));
  };

  return (
    <div className={`fl-money ${className || ''}`}>
      <span className="fl-money-mark">¥</span>
      <input
        type="text"
        value={editing ? raw : (value ? value.toLocaleString() : '')}
        placeholder="0"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={editing ? handleChange : undefined}
        readOnly={!editing}
      />
    </div>
  );
};
