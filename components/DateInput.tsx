import React, { useState, useEffect } from 'react';
import { ERAS, DateMode } from '../lib/dateUtils';

// Re-export for compatibility if needed, but better to import from lib
export type { DateMode };

interface DateInputProps {
    value: string; // YYYY-MM-DD
    mode: DateMode;
    onChange: (value: string, mode: DateMode) => void;
    label?: string;
    className?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ value, mode, onChange, label, className = '' }) => {
    // Local state for inputs
    const [era, setEra] = useState<string>('western');
    const [year, setYear] = useState<string>('');
    const [month, setMonth] = useState<string>('');
    const [day, setDay] = useState<string>('');

    // Initialize from props
    useEffect(() => {
        if (!value) {
            setYear('');
            setMonth('');
            setDay('');
            setEra(mode === 'japanese' ? 'reiwa' : 'western'); // Default to Reiwa if Japanese but no value
            return;
        }

        const date = new Date(value);
        if (isNaN(date.getTime())) return;

        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();

        if (mode === 'western') {
            setEra('western');
            setYear(y.toString());
        } else {
            // Find appropriate era (skip western index 0)
            let targetEra = ERAS.find(e => e.value !== 'western' && y > e.startYear);

            // Fallback for very old dates or future
            if (!targetEra) targetEra = ERAS[1]; // Reiwa

            setEra(targetEra.value);
            setYear((y - targetEra.startYear).toString());
        }
        setMonth(m.toString());
        setDay(d.toString());
    }, [value, mode]);

    const handleChange = (newEra: string, newYear: string, newMonth: string, newDay: string) => {
        setEra(newEra);
        setYear(newYear);
        setMonth(newMonth);
        setDay(newDay);

        // Determine new Mode
        const newMode: DateMode = newEra === 'western' ? 'western' : 'japanese';

        if (!newYear || !newMonth || !newDay) {
            // Incomplete input
            if (newYear === '' && newMonth === '' && newDay === '') {
                onChange('', newMode);
            }
            return;
        }

        const yVal = parseInt(newYear);
        const mVal = parseInt(newMonth);
        const dVal = parseInt(newDay);

        if (isNaN(yVal) || isNaN(mVal) || isNaN(dVal)) return;

        let finalYear = yVal;
        if (newEra !== 'western') {
            const eraObj = ERAS.find(e => e.value === newEra);
            if (eraObj && eraObj.value !== 'western') {
                finalYear = yVal + eraObj.startYear;
            }
        }

        // Format YYYY-MM-DD
        const formatted = `${finalYear}-${String(mVal).padStart(2, '0')}-${String(dVal).padStart(2, '0')}`;
        onChange(formatted, newMode);
    };

    return (
        <div className={className}>
            {label && <label>{label}</label>}
            <div className="fl-date">
                <select
                    value={era}
                    onChange={(e) => handleChange(e.target.value, year, month, day)}
                >
                    {ERAS.map(e => <option key={e.value} value={e.value}>{e.name}</option>)}
                </select>

                <div className="fl-date-part">
                    <input
                        type="number"
                        min="1"
                        value={year}
                        onChange={(e) => handleChange(era, e.target.value, month, day)}
                        placeholder="年"
                    />
                    <span>年</span>
                </div>

                <div className="fl-date-part">
                    <input
                        type="number"
                        min="1"
                        max="12"
                        value={month}
                        onChange={(e) => handleChange(era, year, e.target.value, day)}
                        placeholder="月"
                    />
                    <span>月</span>
                </div>

                <div className="fl-date-part">
                    <input
                        type="number"
                        min="1"
                        max="31"
                        value={day}
                        onChange={(e) => handleChange(era, year, month, e.target.value)}
                        placeholder="日"
                    />
                    <span>日</span>
                </div>
            </div>
        </div>
    );
};
