'use client';

import { useId, useState } from 'react';

export function AreaField({
  label,
  options,
  defaultValue = 'University',
  className = '',
}: {
  label: string;
  options: string[];
  defaultValue?: string;
  className?: string;
}) {
  const id = useId();
  const [selection, setSelection] = useState(options.includes(defaultValue) ? defaultValue : '');
  const [newArea, setNewArea] = useState(options.includes(defaultValue) ? '' : defaultValue);

  return (
    <div className={`text-sm font-medium ${className}`}>
      <label htmlFor={`${id}-select`}>{label}</label>
      <select
        id={`${id}-select`}
        name={selection ? 'area' : undefined}
        value={selection}
        onChange={(event) => setSelection(event.target.value)}
        className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
      >
        {options.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
        <option value="">+ New area…</option>
      </select>
      {selection === '' && (
        <label htmlFor={`${id}-new`} className="mt-3 block">
          New area name
          <input
            id={`${id}-new`}
            name="area"
            value={newArea}
            onChange={(event) => setNewArea(event.target.value)}
            required
            maxLength={80}
            placeholder="Enter an area name"
            className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
          />
        </label>
      )}
    </div>
  );
}
