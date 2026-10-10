import { addEnglishPracticeAction } from '@/lib/actions/evidence-actions';
import { ActionForm } from './action-form';

export const englishPracticeTypes = [
  ['free_speaking', 'Free speaking'],
  ['technical_explanation', 'Technical explanation'],
  ['mock_interview', 'Mock interview'],
  ['conversation', 'Conversation'],
  ['grammar', 'Grammar practice'],
  ['pronunciation', 'Pronunciation'],
] as const;

const field = 'mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm font-normal';
const label = 'block text-sm font-semibold text-foreground';

export function EnglishPracticeForm({ today }: { today: string }) {
  return (
    <ActionForm
      action={addEnglishPracticeAction}
      submitLabel="Save practice"
      showSuccess={false}
      successConfirmation="Practice recorded"
      className="mt-4 grid max-w-3xl gap-x-4 gap-y-5 sm:grid-cols-2"
    >
      <label className={label}>
        Date
        <input
          type="date"
          name="date"
          defaultValue={today}
          max={today}
          required
          className={field}
        />
      </label>
      <label className={label}>
        Type
        <select name="type" defaultValue="free_speaking" className={field}>
          {englishPracticeTypes.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Topic
        <input
          name="topic"
          required
          maxLength={160}
          placeholder="e.g. Daily conversation"
          className={field}
        />
      </label>
      <label className={label}>
        Minutes
        <input
          type="number"
          name="durationMinutes"
          min="1"
          max="1440"
          required
          placeholder="e.g. 15"
          className={field}
        />
      </label>
    </ActionForm>
  );
}
