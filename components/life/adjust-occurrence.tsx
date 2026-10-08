import type { BlockOccurrence } from '@/lib/planning/time-blocks';
import { previewOccurrenceAction, updateOccurrenceAction } from '@/lib/actions/life-actions';
import { ActionForm } from './action-form';

export function AdjustOccurrence({
  block,
  originalTime,
}: {
  block: BlockOccurrence;
  originalTime: { start: string; end: string };
}) {
  if (block.isFixed) return null;
  return (
    <details className="mt-2 text-sm">
      <summary className="min-h-10 cursor-pointer py-2 font-medium text-primary">Adjust</summary>
      <p className="mb-2 text-xs text-muted-foreground">
        Original: {block.originalDate}, {originalTime.start}–{originalTime.end}. Changes affect this
        occurrence only.
      </p>
      {['skipped', 'excused'].includes(block.occurrenceStatus) ? (
        <ActionForm action={updateOccurrenceAction} submitLabel="Restore session">
          <input type="hidden" name="blockId" value={block.id} />
          <input type="hidden" name="occurrenceDate" value={block.originalDate} />
          <input type="hidden" name="status" value="planned" />
        </ActionForm>
      ) : (
        <div className="space-y-3">
          {block.occurrenceStatus !== 'completed' && (
            <>
              <ActionForm
                action={updateOccurrenceAction}
                submitLabel="Skip session"
                className="space-y-2"
              >
                <input type="hidden" name="blockId" value={block.id} />
                <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                <input type="hidden" name="status" value="skipped" />
                <label className="block">
                  Reason (optional)
                  <input
                    name="reason"
                    maxLength={500}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                  />
                </label>
              </ActionForm>
              <ActionForm
                action={updateOccurrenceAction}
                previewAction={previewOccurrenceAction}
                submitLabel="Save adjustment"
                className="grid gap-2 sm:grid-cols-2"
              >
                <input type="hidden" name="blockId" value={block.id} />
                <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                <input type="hidden" name="status" value="rescheduled" />
                <label className="text-xs">
                  New date
                  <input
                    type="date"
                    name="overrideDate"
                    required
                    defaultValue={block.date}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                  />
                </label>
                <label className="text-xs">
                  Start
                  <input
                    type="time"
                    name="overrideStartTime"
                    required
                    defaultValue={block.localStartTime}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                  />
                </label>
                <label className="text-xs">
                  End
                  <input
                    type="time"
                    name="overrideEndTime"
                    required
                    defaultValue={block.localEndTime}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="allowOverlap" /> Allow a flexible overlap after
                  reviewing the warning
                </label>
              </ActionForm>
              {block.occurrenceStatus === 'rescheduled' && (
                <ActionForm
                  action={updateOccurrenceAction}
                  previewAction={previewOccurrenceAction}
                  submitLabel="Return to original slot"
                >
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="occurrenceDate" value={block.originalDate} />
                  <input type="hidden" name="status" value="planned" />
                </ActionForm>
              )}
            </>
          )}
        </div>
      )}
    </details>
  );
}
