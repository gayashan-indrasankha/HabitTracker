import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import {
  getAssessments,
  getGoals,
  getMetrics,
  getProjects,
  getSubjects,
  getTasks,
} from '@/lib/dal/life';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import {
  addAssessmentAction,
  createGoalAction,
  createProjectAction,
  createTaskAction,
  deleteTaskAction,
  editTaskAction,
  saveSubjectAction,
  updateAssessmentAction,
  updateTaskAction,
} from '@/lib/actions/life-actions';
import { ActionForm } from '@/components/life/action-form';
import { AreaField } from '@/components/life/area-field';
import { EditGoalForm, EditProjectForm } from '@/components/life/entity-edit-forms';
import { setGoalArchiveAction, setProjectArchiveAction } from '@/lib/actions/life-actions';
import { WeightTrend } from '@/components/life/weight-trend';
import { weightTrend } from '@/lib/evidence/summary';

export const metadata = { title: 'Goals & Projects | LifeOS' };

const areas = [
  'University',
  'Career',
  'Industry Project',
  'Interview Preparation',
  'Fitness',
  'Communication',
  'Reading',
  'Sleep & Recovery',
  'Personal Development',
];

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; show?: string }>;
}) {
  const params = await searchParams;
  const requestedView = params.view;
  const view = ['goals', 'projects', 'study'].includes(requestedView ?? '')
    ? requestedView
    : 'tasks';
  const userId = (await requireUser()).id;
  const [goals, projects, tasks, subjects, assessments, metrics, settings] = await Promise.all([
    getGoals(userId),
    getProjects(userId),
    getTasks(userId),
    getSubjects(userId),
    getAssessments(userId),
    getMetrics(userId),
    getUserSettings(userId),
  ]);
  const today = toDateString(getTodayInTimezone(settings.timezone));
  const activeTasks = tasks.filter((task) => !['done', 'cancelled'].includes(task.status));
  const inactiveTasks = tasks.filter((task) => ['done', 'cancelled'].includes(task.status));
  const savedAreas = [
    ...new Set([...goals.map((goal) => goal.area), ...tasks.map((task) => task.area)]),
  ]
    .filter((area) => area && !areas.includes(area))
    .sort((first, second) => first.localeCompare(second));
  const availableAreas = [...areas, ...savedAreas];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Goals & projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your tasks, goals, and projects together. Start with a task; connect it to a bigger
          goal whenever you are ready.
        </p>
      </header>
      <nav
        aria-label="Goals and projects sections"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: 'Tasks', href: '/goals', value: 'tasks' },
          { label: 'Goals', href: '/goals?view=goals', value: 'goals' },
          { label: 'Projects', href: '/goals?view=projects', value: 'projects' },
          { label: 'Study records', href: '/goals?view=study', value: 'study' },
        ].map((item) => (
          <Link
            key={item.value}
            href={item.href}
            aria-current={view === item.value ? 'page' : undefined}
            className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-colors ${view === item.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {view === 'goals' && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-bold">Goals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A goal is a result you want to reach. Add one when you know what you are working toward.
          </p>
          <details className="mb-5 mt-4">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground [&::-webkit-details-marker]:hidden">
              Add a goal
            </summary>
            <ActionForm
              action={createGoalAction}
              submitLabel="Create goal"
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <AreaField label="Life area" options={availableAreas} />
              <label className="text-sm">
                Title{' '}
                <input
                  name="title"
                  required
                  maxLength={160}
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Description{' '}
                <textarea
                  name="description"
                  maxLength={2000}
                  className="mt-1 w-full rounded-lg border bg-background p-3"
                />
              </label>
              <label className="text-sm">
                Target date{' '}
                <input
                  type="date"
                  name="targetDate"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                />
              </label>
              <label className="text-sm">
                Priority{' '}
                <select
                  name="priority"
                  defaultValue="2"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                >
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </select>
              </label>
              <label className="text-sm">
                Measurable target{' '}
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="targetValue"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                />
              </label>
              <label className="text-sm">
                Unit{' '}
                <input
                  name="targetUnit"
                  maxLength={32}
                  placeholder="kg, books, applications"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                />
              </label>
            </ActionForm>
          </details>
          <ul className="mt-3 space-y-2">
            {goals
              .filter((goal) => !goal.archivedAt)
              .map((goal) => (
                <li key={goal.id} className="rounded-xl border p-3">
                  <p className="text-xs font-semibold text-primary">{goal.area}</p>
                  <h3 className="font-semibold">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {goal.status}
                    {goal.targetDate ? ` · Target ${goal.targetDate}` : ''}
                    {goal.targetValue != null
                      ? ` · ${goal.targetValue} ${goal.targetUnit ?? ''}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {
                      tasks.filter((task) => task.goalId === goal.id && task.status === 'done')
                        .length
                    }{' '}
                    related tasks finished
                    {goal.targetUnit === 'kg' &&
                    metrics.find((metric) => metric.type === 'Body weight' && metric.unit === 'kg')
                      ? ` · Latest recorded weight ${metrics.find((metric) => metric.type === 'Body weight' && metric.unit === 'kg')!.value} kg`
                      : ''}
                  </p>
                  <EditGoalForm goal={goal} />
                  {goal.area === 'Fitness' && goal.targetUnit === 'kg' && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-primary">
                        Body-weight trend
                      </summary>
                      <WeightTrend
                        points={
                          weightTrend(
                            metrics
                              .filter(
                                (metric) => metric.type === 'Body weight' && metric.unit === 'kg',
                              )
                              .map((metric) => ({ date: metric.date, value: metric.value })),
                            settings.weekStartsOn,
                            goal.targetValue,
                          ).daily
                        }
                        target={goal.targetValue}
                      />
                      <Link
                        href="/goals/evidence#weight"
                        className="text-sm text-primary underline"
                      >
                        Manage measurements
                      </Link>
                    </details>
                  )}
                </li>
              ))}
            {!goals.some((goal) => !goal.archivedAt) && (
              <li className="text-sm text-muted-foreground">
                {goals.length
                  ? 'No active goals. Add a goal or restore one from the archive.'
                  : 'No goals yet. Start with one meaningful outcome.'}
              </li>
            )}
          </ul>
          {goals.some((goal) => goal.archivedAt) && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold text-primary">
                Archived goals
              </summary>
              <ul className="mt-2 space-y-2">
                {goals
                  .filter((goal) => goal.archivedAt)
                  .map((goal) => (
                    <li key={goal.id} className="rounded-xl border p-3 text-sm">
                      <strong>{goal.title}</strong>
                      <p className="text-muted-foreground">
                        {goal.area} · {goal.status}
                      </p>
                      <ActionForm action={setGoalArchiveAction} submitLabel="Restore goal">
                        <input type="hidden" name="id" value={goal.id} />
                        <input type="hidden" name="archive" value="no" />
                      </ActionForm>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      )}
      {view === 'projects' && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-bold">Projects</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A project groups tasks that belong to the same piece of work.
          </p>
          <details className="mb-5 mt-4">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground [&::-webkit-details-marker]:hidden">
              Add a project
            </summary>
            <ActionForm
              action={createProjectAction}
              submitLabel="Create project"
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <label className="text-sm">
                Name{' '}
                <input
                  name="name"
                  required
                  maxLength={160}
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                />
              </label>
              <label className="text-sm">
                Type{' '}
                <select
                  name="type"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                >
                  <option>UCSC Industry Project</option>
                  <option>Software Engineering Portfolio</option>
                  <option>DevOps Portfolio</option>
                  <option>General</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                Description{' '}
                <textarea
                  name="description"
                  maxLength={2000}
                  className="mt-1 w-full rounded-lg border bg-background p-3"
                />
              </label>
              <label className="text-sm">
                Related goal{' '}
                <select
                  name="goalId"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                >
                  <option value="">None</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Deadline{' '}
                <input
                  type="date"
                  name="deadline"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Repository URL{' '}
                <input
                  type="url"
                  name="repositoryUrl"
                  placeholder="https://…"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                />
              </label>
            </ActionForm>
          </details>
          <ul className="mt-3 space-y-2">
            {projects
              .filter((project) => !project.archivedAt)
              .map((project) => {
                const linked = tasks.filter((task) => task.projectId === project.id);
                const milestones = linked.filter((task) => task.isMilestone);
                const next = linked.find(
                  (task) => task.status !== 'done' && task.status !== 'cancelled',
                );
                return (
                  <li key={project.id} className="rounded-xl border p-3">
                    <p className="text-xs font-semibold text-primary">{project.type}</p>
                    <h3 className="font-semibold">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {milestones.filter((task) => task.status === 'done').length} of{' '}
                      {milestones.length} milestones complete
                    </p>
                    <p className="mt-1 text-sm">Next: {next?.title ?? 'Add an actionable task'}</p>
                    {project.repositoryUrl && (
                      <a
                        href={project.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline"
                      >
                        Repository
                      </a>
                    )}
                    <EditProjectForm project={project} goals={goals} />
                    <Link
                      href="/goals/evidence#portfolio"
                      className="mt-2 block text-sm text-primary underline"
                    >
                      Review milestone quality
                    </Link>
                  </li>
                );
              })}
            {!projects.some((project) => !project.archivedAt) && (
              <li className="text-sm text-muted-foreground">
                {projects.length
                  ? 'No active projects. Create one or restore one from the archive.'
                  : 'No projects yet. Create one to connect your work to a goal.'}
              </li>
            )}
          </ul>
          {projects.some((project) => project.archivedAt) && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold text-primary">
                Archived projects
              </summary>
              <ul className="mt-2 space-y-2">
                {projects
                  .filter((project) => project.archivedAt)
                  .map((project) => (
                    <li key={project.id} className="rounded-xl border p-3 text-sm">
                      <strong>{project.name}</strong>
                      <p className="text-muted-foreground">
                        {project.type} · {project.status}
                      </p>
                      <ActionForm action={setProjectArchiveAction} submitLabel="Restore project">
                        <input type="hidden" name="id" value={project.id} />
                        <input type="hidden" name="archive" value="no" />
                      </ActionForm>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      )}
      {view === 'tasks' && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-bold">Tasks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the things you want to do. Choose up to three to focus on each day in Today.
          </p>
          <details className="group/addtask mb-6 mt-4">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="text-lg leading-none group-open/addtask:hidden">
                +
              </span>
              <span className="group-open/addtask:hidden">Add a task</span>
              <span className="hidden group-open/addtask:inline">Close form</span>
            </summary>
            <ActionForm
              action={createTaskAction}
              submitLabel="Add task"
              showSuccess={false}
              successConfirmation="Task added"
              className="mt-4 grid max-w-3xl gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 sm:p-5"
            >
              <label className="text-sm font-medium sm:col-span-2">
                Task title
                <input
                  name="title"
                  required
                  maxLength={160}
                  placeholder="What do you want to get done?"
                  className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                />
              </label>
              <AreaField label="Area" options={availableAreas} className="sm:col-span-2" />
              <details className="group/taskdetails border-t pt-3 sm:col-span-2">
                <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg bg-primary/5 px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                  More task details
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="size-4 transition-transform group-open/taskdetails:rotate-180"
                  >
                    <path
                      d="m5 7.5 5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium sm:col-span-2">
                    Details
                    <textarea
                      name="details"
                      maxLength={4000}
                      className="mt-1.5 min-h-24 w-full rounded-lg border bg-background p-3 font-normal"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Project
                    <select
                      name="projectId"
                      className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                    >
                      <option value="">None</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Goal
                    <select
                      name="goalId"
                      className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                    >
                      <option value="">None</option>
                      {goals.map((goal) => (
                        <option key={goal.id} value={goal.id}>
                          {goal.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Priority
                    <select
                      name="priority"
                      defaultValue="2"
                      className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                    >
                      <option value="1">High</option>
                      <option value="2">Medium</option>
                      <option value="3">Low</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Due date
                    <input
                      type="date"
                      name="dueDate"
                      className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Planned date
                    <input
                      type="date"
                      name="scheduledDate"
                      defaultValue={today}
                      className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="isMilestone" /> Project milestone
                  </label>
                </div>
              </details>
            </ActionForm>
          </details>
          <ul className="grid items-start gap-4 md:grid-cols-2">
            {activeTasks.map((task) => (
              <li
                id={`task-${task.id}`}
                key={task.id}
                className="scroll-mt-32 rounded-2xl border bg-card p-4 shadow-sm lg:scroll-mt-20"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                        {task.area}
                      </span>
                      {task.projectId && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                          {projects.find((project) => project.id === task.projectId)?.name ??
                            'Project'}
                        </span>
                      )}
                      {task.isMilestone && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                          Milestone
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold leading-snug text-foreground">
                      {task.title}
                    </h3>
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{task.status === 'in_progress' ? 'In progress' : 'To do'}</span>
                      {task.scheduledDate && <span>Planned {task.scheduledDate}</span>}
                      {task.dueDate && <span>Due {task.dueDate}</span>}
                    </p>
                  </div>
                  <ActionForm
                    action={updateTaskAction}
                    submitLabel="Mark done"
                    className="shrink-0 self-start"
                    showSuccess={false}
                  >
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="status" value="done" />
                  </ActionForm>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto] items-start gap-2 border-t pt-3">
                  <details className="group min-w-0 open:col-span-2">
                    <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg bg-primary/5 px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                      Edit task
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="size-4 transition-transform group-open:rotate-180"
                      >
                        <path
                          d="m5 7.5 5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </summary>
                    <ActionForm
                      action={editTaskAction}
                      submitLabel="Save task"
                      className="mt-3 grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 [&>button]:min-w-32 [&>button]:justify-self-end sm:[&>button]:col-start-2"
                    >
                      <input type="hidden" name="id" value={task.id} />
                      <input
                        type="hidden"
                        name="estimatedMinutes"
                        value={task.estimatedMinutes ?? ''}
                      />
                      <label className="text-sm font-medium">
                        Title
                        <input
                          name="title"
                          defaultValue={task.title}
                          required
                          maxLength={160}
                          className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Area
                        <input
                          name="area"
                          defaultValue={task.area}
                          required
                          maxLength={80}
                          className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium sm:col-span-2">
                        Details
                        <textarea
                          name="details"
                          defaultValue={task.details ?? ''}
                          maxLength={4000}
                          className="mt-1.5 min-h-24 w-full rounded-lg border bg-background p-3 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Project
                        <select
                          name="projectId"
                          defaultValue={task.projectId ?? ''}
                          className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                        >
                          <option value="">None</option>
                          {projects.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Goal
                        <select
                          name="goalId"
                          defaultValue={task.goalId ?? ''}
                          className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                        >
                          <option value="">None</option>
                          {goals.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Priority
                        <select
                          name="priority"
                          defaultValue={task.priority}
                          className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                        >
                          <option value="1">High</option>
                          <option value="2">Medium</option>
                          <option value="3">Low</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Due date
                        <input
                          type="date"
                          name="dueDate"
                          defaultValue={task.dueDate ?? ''}
                          className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Planned date
                        <input
                          type="date"
                          name="scheduledDate"
                          defaultValue={task.scheduledDate ?? ''}
                          className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 font-normal"
                        />
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          name="isMilestone"
                          defaultChecked={task.isMilestone}
                        />{' '}
                        Milestone
                      </label>
                    </ActionForm>
                  </details>
                  <details className="group/delete justify-self-end open:col-span-2 open:justify-self-stretch">
                    <summary
                      title="Delete task"
                      aria-label={`Delete options for ${task.title}`}
                      className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-destructive [&::-webkit-details-marker]:hidden"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
                        <path
                          d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6m4-6v6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </summary>
                    <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                      <p className="font-semibold">Delete “{task.title}”?</p>
                      <p className="mt-1 text-muted-foreground">
                        This removes the task from your list and Today. You cannot undo this.
                      </p>
                      <ActionForm
                        action={deleteTaskAction}
                        submitLabel="Delete task"
                        buttonVariant="danger"
                        showSuccess={false}
                        className="mt-3"
                      >
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="confirmation" value="delete" />
                      </ActionForm>
                    </div>
                  </details>
                </div>
              </li>
            ))}
            {!activeTasks.length && (
              <li className="text-sm text-muted-foreground">Your tasks will appear here.</li>
            )}
          </ul>
          {inactiveTasks.length > 0 && (
            <details className="mt-5 border-t pt-4" open={params.show === 'finished'}>
              <summary className="cursor-pointer text-sm font-semibold text-primary">
                Finished or cancelled ({inactiveTasks.length})
              </summary>
              <ul className="mt-3 space-y-2">
                {inactiveTasks.map((task) => (
                  <li
                    id={`task-${task.id}`}
                    key={task.id}
                    className="scroll-mt-32 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 lg:scroll-mt-20"
                  >
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {task.area} · {task.status === 'done' ? 'Done' : 'Cancelled'}
                      </p>
                    </div>
                    <ActionForm
                      action={updateTaskAction}
                      submitLabel="Reopen"
                      showSuccess={false}
                      buttonVariant="secondary"
                    >
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="status" value="todo" />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
      {view === 'study' && (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-bold">Subjects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep your subject names and grades together.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold text-primary">
                {subjects.length ? 'Edit subjects' : 'Add your subjects'}
              </summary>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }, (_, index) => {
                  const subject = subjects.find((item) => item.slot === index + 1);
                  return (
                    <ActionForm
                      key={index}
                      action={saveSubjectAction}
                      submitLabel="Save subject"
                      className="space-y-2 rounded-xl border p-3"
                    >
                      <input type="hidden" name="slot" value={index + 1} />
                      <label className="block text-sm">
                        Subject {index + 1}
                        <input
                          name="name"
                          defaultValue={subject?.name ?? ''}
                          maxLength={120}
                          placeholder="Name"
                          className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                        />
                      </label>
                      <label className="block text-xs">
                        Target grade
                        <input
                          name="targetGrade"
                          defaultValue={subject?.targetGrade ?? ''}
                          maxLength={20}
                          className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                        />
                      </label>
                      <label className="block text-xs">
                        Actual grade
                        <input
                          name="actualGrade"
                          defaultValue={subject?.actualGrade ?? ''}
                          maxLength={20}
                          className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                        />
                      </label>
                    </ActionForm>
                  );
                })}
              </div>
            </details>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-bold">Assessments</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Record deadlines, completion, and actual results for a subject.
            </p>
            <ul className="space-y-2">
              {assessments.map((item) => (
                <li key={item.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {subjects.find((subject) => subject.id === item.subjectId)?.name ||
                      'Unnamed subject'}
                    {item.dueDate ? ` · Due ${item.dueDate}` : ''} · {item.status}
                  </p>
                  <ActionForm
                    action={updateAssessmentAction}
                    submitLabel="Save assessment"
                    className="mt-2 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="id" value={item.id} />
                    <label>
                      Status{' '}
                      <select
                        name="status"
                        defaultValue={item.status}
                        className="ml-2 min-h-10 rounded-lg border bg-background px-2"
                      >
                        <option value="todo">To do</option>
                        <option value="done">Done</option>
                      </select>
                    </label>
                    <label>
                      Actual grade{' '}
                      <input
                        name="actualGrade"
                        defaultValue={item.actualGrade ?? ''}
                        maxLength={20}
                        className="ml-2 min-h-10 rounded-lg border bg-background px-2"
                      />
                    </label>
                  </ActionForm>
                </li>
              ))}
              {!assessments.length && (
                <li className="text-sm text-muted-foreground">No assessments recorded.</li>
              )}
            </ul>
            {subjects.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold text-primary">
                  Add assessment
                </summary>
                <ActionForm
                  action={addAssessmentAction}
                  submitLabel="Add assessment"
                  className="mt-3 grid gap-3 sm:grid-cols-2"
                >
                  <label className="text-sm">
                    Subject{' '}
                    <select
                      name="subjectId"
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                    >
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name || `Subject ${subject.slot}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Assessment{' '}
                    <input
                      name="title"
                      required
                      maxLength={160}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                    />
                  </label>
                  <label className="text-sm">
                    Due date{' '}
                    <input
                      type="date"
                      name="dueDate"
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                    />
                  </label>
                </ActionForm>
              </details>
            )}
          </section>
        </div>
      )}
      <Link
        href="/goals/evidence"
        className="inline-block text-sm font-medium text-primary underline underline-offset-2"
      >
        Evidence & career readiness
      </Link>
    </div>
  );
}
