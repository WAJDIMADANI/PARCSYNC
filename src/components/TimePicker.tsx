import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function TimePicker({ value, onChange, required = false, placeholder = 'HH:MM', className = '' }: TimePickerProps) {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  useEffect(() => {
    if (value) {
      const parts = value.split(':');
      if (parts.length >= 2) {
        setHours(parts[0].padStart(2, '0'));
        setMinutes(parts[1].padStart(2, '0'));
      }
    }
  }, [value]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHours = e.target.value;
    setHours(newHours);
    if (newHours && minutes) {
      onChange(`${newHours}:${minutes}`);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinutes = e.target.value;
    setMinutes(newMinutes);
    if (hours && newMinutes) {
      onChange(`${hours}:${newMinutes}`);
    }
  };

  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const timeRegex = /^([0-2]?[0-9]):([0-5][0-9])$/;

    if (timeRegex.test(input)) {
      const [h, m] = input.split(':');
      const hourNum = parseInt(h);
      if (hourNum >= 0 && hourNum <= 23) {
        setHours(h.padStart(2, '0'));
        setMinutes(m);
        onChange(`${h.padStart(2, '0')}:${m}`);
      }
    }
  };

  const generateHours = () => {
    const hrs = [];
    for (let i = 0; i < 24; i++) {
      const h = i.toString().padStart(2, '0');
      hrs.push(h);
    }
    return hrs;
  };

  const generateMinutes = () => {
    const mins = [];
    for (let i = 0; i < 60; i += 5) {
      const m = i.toString().padStart(2, '0');
      mins.push(m);
    }
    return mins;
  };

  const displayValue = hours && minutes ? `${hours}:${minutes}` : '';

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleDirectInput}
          placeholder={placeholder}
          required={required}
          pattern="[0-2][0-9]:[0-5][0-9]"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Heures</label>
          <select
            value={hours}
            onChange={handleHoursChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">--</option>
            {generateHours().map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Minutes</label>
          <select
            value={minutes}
            onChange={handleMinutesChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">--</option>
            {generateMinutes().map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
