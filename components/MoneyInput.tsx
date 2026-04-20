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
    <div className={`flex items-center gap-1.5 ${className || ''}`}>
      <span className="text-base text-gray-500 font-medium">¥</span>
      <input
        type={editing ? 'text' : 'text'}
        value={editing ? raw : (value ? value.toLocaleString() : '')}
        placeholder="0"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={editing ? handleChange : undefined}
        readOnly={!editing}
        className="w-full sm:w-36 text-base p-2.5 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono bg-white transition-shadow hover:border-gray-400 cursor-text"
      />
    </div>
  );
};
