import Link from 'next/link';
import type { tasks } from '@/lib/db/schema';
import { managePriorityAction, updateTaskAction } from '@/lib/actions/life-actions';
import { ActionForm } from './action-form';
import { PriorityPicker, type BacklogChoice } from './priority-picker';

type Task = typeof tasks.$inferSelect;
const labels = ['Most important', 'Second most important', 'Third most important'];

export function PriorityPanel({
  date,
  mode,
  selected,
  choices,
}: {
  date: string;
  mode: string;
  selected: Task[];
  choices: BacklogChoice[];
}) {
  const slots = [1, 2, 3].map((rank) => selected.find((task) => task.dailyPriority === rank));
  const emphasized = mode === 'minimum' ? 1 : mode === 'reduced' ? 2 : 3;
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Today’s three wins</h2>
        <Link href="/goals" className="text-sm font-medium text-primary hover:underline">
          Manage tasks
        </Link>
      </div>
      <ol className="space-y-3">
        {slots.map((task, index) => (
          <li
            key={index}
            hidden={index >= emphasized}
            className={`rounded-xl border p-4 ${index >= emphasized ? 'bg-muted/40' : ''}`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Priority {index + 1} — {labels[index]}
              {index >= emphasized ? ' · stored for normal mode' : ''}
            </p>
            {task ? (
              <>
                <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {task.area} · {task.status.replace('_', ' ')}
                    </p>
                    <Link
                      href={`/goals#task-${task.id}`}
                      className="text-xs text-primary underline"
                    >
                      Edit task
                    </Link>
                  </div>
                  <ActionForm
                    action={updateTaskAction}
                    submitLabel={task.status === 'done' ? 'Reopen' : 'Complete'}
                  >
                    <input type="hidden" name="id" value={task.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={task.status === 'done' ? 'todo' : 'done'}
                    />
                  </ActionForm>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {index > 0 && (
                    <ActionForm action={managePriorityAction} submitLabel="Move up">
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="operation" value="move" />
                      <input type="hidden" name="rank" value={index} />
                    </ActionForm>
                  )}
                  {index < 2 && slots[index + 1] && (
                    <ActionForm action={managePriorityAction} submitLabel="Move down">
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="operation" value="move" />
                      <input type="hidden" name="rank" value={index + 2} />
                    </ActionForm>
                  )}
                  <ActionForm action={managePriorityAction} submitLabel="Remove priority">
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="date" value={date} />
                    <input type="hidden" name="operation" value="remove" />
                  </ActionForm>
                </div>
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-primary">Reschedule or swap</summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ActionForm action={updateTaskAction} submitLabel="Reschedule">
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="status" value={task.status} />
                      <label className="block text-xs">
                        New date
                        <input
                          type="date"
                          name="scheduledDate"
                          required
                          defaultValue={date}
                          className="mt-1 min-h-10 rounded-lg border bg-background px-2"
                        />
                      </label>
                    </ActionForm>
                    {selected.length > 1 && (
                      <ActionForm action={managePriorityAction} submitLabel="Swap priorities">
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="date" value={date} />
                        <input type="hidden" name="operation" value="move" />
                        <label className="block text-xs">
                          Swap with
                          <select
                            name="rank"
                            defaultValue={
                              slots.findIndex((other) => other && other.id !== task.id) + 1
                            }
                            className="mt-1 min-h-10 rounded-lg border bg-background px-2"
                          >
                            {slots.map((other, otherIndex) =>
                              other && otherIndex !== index ? (
                                <option key={other.id} value={otherIndex + 1}>
                                  Priority {otherIndex + 1}
                                </option>
                              ) : null,
                            )}
                          </select>
                        </label>
                      </ActionForm>
                    )}
                  </div>
                </details>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Empty slot. Choose a task below.</p>
            )}
          </li>
        ))}
      </ol>
      {emphasized < 3 && (
        <details className="mt-3 rounded-xl border p-3 text-sm">
          <summary className="min-h-10 cursor-pointer py-2 font-semibold text-primary">
            Show full priority plan
          </summary>
          <ol start={emphasized + 1} className="mt-2 space-y-2">
            {slots.slice(emphasized).map((task, index) => (
              <li key={index} className="rounded-lg border p-2">
                Priority {emphasized + index + 1}:{' '}
                {task ? (
                  <>
                    <strong>{task.title}</strong> · {task.status.replace('_', ' ')} ·{' '}
                    <Link href={`/goals#task-${task.id}`} className="text-primary underline">
                      Open task
                    </Link>
                  </>
                ) : (
                  'Empty'
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            These assignments are saved. Changing day mode does not complete, skip, or reschedule
            them.
          </p>
        </details>
      )}
      <PriorityPicker
        date={date}
        choices={choices}
        occupied={slots.map((task) => task?.title ?? null)}
      />
    </section>
  );
}
