const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekdaySelector({
  mask,
  legend = 'Recurring weekdays',
}: {
  mask: string;
  legend?: string;
}) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <input type="hidden" name="weekdaySelection" value="yes" />
      <div className="flex flex-wrap gap-2">
        {days.map((day, index) => (
          <label
            key={day}
            className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"
          >
            <input
              type="checkbox"
              name="weekday"
              value={index}
              defaultChecked={mask[index] === '1'}
            />
            {day}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
