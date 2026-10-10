'use client';

import { useState } from 'react';

type StageOption = readonly [string, string];

const field = 'mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3';

export function ApplicationStageFields({
  options,
  today,
  mode,
  initialStage = 'saved',
  submittedOn = null,
}: {
  options: readonly StageOption[];
  today: string;
  mode: 'create' | 'update';
  initialStage?: string;
  submittedOn?: string | null;
}) {
  const [stage, setStage] = useState(initialStage);
  const [applicationDate, setApplicationDate] = useState(submittedOn ?? '');
  const isApplied = stage === 'applied';
  const needsApplicationDate = !['saved', 'withdrawn'].includes(stage);

  return (
    <>
      <label className="block text-sm font-medium">
        {mode === 'create' ? 'Stage' : 'Next stage'}
        <select
          name="stage"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
          className={field}
        >
          {options.map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </label>
      {isApplied ? (
        <div className="text-sm font-medium">
          Applied stage date
          <div className="mt-1.5 flex min-h-11 items-center rounded-lg border bg-muted/40 px-3 text-sm font-normal text-muted-foreground">
            {applicationDate || 'Enter the application date below'}
          </div>
          <p className="mt-1 text-xs font-normal text-muted-foreground">
            Same as the date you submitted the application.
          </p>
        </div>
      ) : (
        <label className="block text-sm font-medium">
          Stage date
          <input
            type="date"
            name="stageOn"
            defaultValue={today}
            max={today}
            required
            className={field}
          />
          {mode === 'update' && (
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Keep the current stage to correct its date.
            </span>
          )}
        </label>
      )}
      {mode === 'update' && submittedOn ? (
        <p className="self-center text-sm text-muted-foreground">
          Submitted {submittedOn}. The submission date stays the same when you record a later stage.
        </p>
      ) : (
        <label className="block text-sm font-medium">
          {mode === 'create'
            ? 'Actual application date, if submitted'
            : 'First application submission date'}
          <input
            type="date"
            name="appliedOn"
            value={applicationDate}
            onChange={(event) => {
              const date = event.target.value;
              setApplicationDate(date);
              if (mode === 'create' && date && stage === 'saved') setStage('applied');
            }}
            max={today}
            required={needsApplicationDate}
            className={field}
          />
        </label>
      )}
    </>
  );
}
