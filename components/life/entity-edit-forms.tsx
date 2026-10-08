import type { goals, projects } from '@/lib/db/schema';
import {
  editGoalAction,
  editProjectAction,
  setGoalArchiveAction,
  setProjectArchiveAction,
} from '@/lib/actions/life-actions';
import { ActionForm } from './action-form';

type Goal = typeof goals.$inferSelect;
type Project = typeof projects.$inferSelect;
const field = 'mt-1 min-h-10 w-full rounded-lg border bg-background px-3';
const statusOptions = ['active', 'paused', 'completed', 'cancelled'] as const;

export function EditGoalForm({ goal }: { goal: Goal }) {
  return (
    <div className="mt-3 space-y-2">
      <details>
        <summary className="cursor-pointer font-medium text-primary">Edit goal</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Close this section to cancel without saving.
        </p>
        <ActionForm
          action={editGoalAction}
          submitLabel="Save goal"
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={goal.id} />
          <label className="text-sm">
            Life area
            <input name="area" required defaultValue={goal.area} className={field} />
          </label>
          <label className="text-sm">
            Title
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={goal.title}
              className={field}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Description
            <textarea
              name="description"
              maxLength={2000}
              defaultValue={goal.description ?? ''}
              className="mt-1 w-full rounded-lg border bg-background p-3"
            />
          </label>
          <label className="text-sm">
            Priority
            <select name="priority" defaultValue={goal.priority} className={field}>
              <option value="1">High</option>
              <option value="2">Medium</option>
              <option value="3">Low</option>
            </select>
          </label>
          <label className="text-sm">
            Status
            <select name="status" defaultValue={goal.status} className={field}>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Target date
            <input
              type="date"
              name="targetDate"
              defaultValue={goal.targetDate ?? ''}
              className={field}
            />
          </label>
          <label className="text-sm">
            Measurable target
            <input
              type="number"
              min="0"
              step="any"
              name="targetValue"
              defaultValue={goal.targetValue ?? ''}
              className={field}
            />
          </label>
          <label className="text-sm">
            Unit
            <input
              name="targetUnit"
              maxLength={32}
              defaultValue={goal.targetUnit ?? ''}
              className={field}
            />
          </label>
        </ActionForm>
      </details>
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">Archive goal</summary>
        <ActionForm
          action={setGoalArchiveAction}
          submitLabel="Archive goal"
          className="mt-2 space-y-2"
        >
          <input type="hidden" name="id" value={goal.id} />
          <input type="hidden" name="archive" value="yes" />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="confirm" value="yes" required /> Keep linked work and hide
            this goal from the active list
          </label>
        </ActionForm>
      </details>
    </div>
  );
}

export function EditProjectForm({
  project,
  goals: availableGoals,
}: {
  project: Project;
  goals: Goal[];
}) {
  return (
    <div className="mt-3 space-y-2">
      <details>
        <summary className="cursor-pointer font-medium text-primary">Edit project</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Close this section to cancel without saving.
        </p>
        <ActionForm
          action={editProjectAction}
          submitLabel="Save project"
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={project.id} />
          <label className="text-sm">
            Name
            <input
              name="name"
              required
              maxLength={160}
              defaultValue={project.name}
              className={field}
            />
          </label>
          <label className="text-sm">
            Type
            <select name="type" defaultValue={project.type} className={field}>
              <option>UCSC Industry Project</option>
              <option>Software Engineering Portfolio</option>
              <option>DevOps Portfolio</option>
              <option>General</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Description
            <textarea
              name="description"
              maxLength={2000}
              defaultValue={project.description ?? ''}
              className="mt-1 w-full rounded-lg border bg-background p-3"
            />
          </label>
          <label className="text-sm">
            Related goal
            <select name="goalId" defaultValue={project.goalId ?? ''} className={field}>
              <option value="">None</option>
              {availableGoals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Status
            <select name="status" defaultValue={project.status} className={field}>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Deadline
            <input
              type="date"
              name="deadline"
              defaultValue={project.deadline ?? ''}
              className={field}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Repository URL
            <input
              type="url"
              name="repositoryUrl"
              defaultValue={project.repositoryUrl ?? ''}
              className={field}
            />
          </label>
        </ActionForm>
      </details>
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">Archive project</summary>
        <ActionForm
          action={setProjectArchiveAction}
          submitLabel="Archive project"
          className="mt-2 space-y-2"
        >
          <input type="hidden" name="id" value={project.id} />
          <input type="hidden" name="archive" value="yes" />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="confirm" value="yes" required /> Keep tasks and milestones
            and hide this project from the active list
          </label>
        </ActionForm>
      </details>
    </div>
  );
}
