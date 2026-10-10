'use client';

import { useId, useState } from 'react';
import { normalizeLifeArea } from '@/lib/life-areas';

export function AreaField({
  label,
  options,
  defaultValue = options[0] ?? '',
  className = '',
}: {
  label: string;
  options: string[];
  defaultValue?: string;
  className?: string;
}) {
  const id = useId();
  const choices = [...new Set(options.map(normalizeLifeArea))];
  const selectedDefault = normalizeLifeArea(defaultValue);
  const [selection, setSelection] = useState(
    choices.includes(selectedDefault) ? selectedDefault : '',
  );
  const [newArea, setNewArea] = useState(choices.includes(selectedDefault) ? '' : selectedDefault);

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
        {choices.map((area) => (
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
