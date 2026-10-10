import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AreaField } from '@/components/life/area-field';
import { LIFE_AREAS } from '@/lib/life-areas';

it('shows current area names once and selects the current name for a legacy value', () => {
  render(
    <AreaField
      label="Life area"
      options={[
        ...LIFE_AREAS,
        'Health & Fitness',
        'Career & Business',
        'Mental & Emotional Well-being',
        'Fun & Recreation',
      ]}
      defaultValue="Health & Fitness"
    />,
  );

  const select = screen.getByRole('combobox', { name: 'Life area' }) as HTMLSelectElement;
  expect([...select.options].map((option) => option.text)).toEqual([...LIFE_AREAS, '+ New area…']);
  expect(select.value).toBe('Fitness');
});
