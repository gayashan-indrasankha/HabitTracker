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
  editTaskAction,
  saveSubjectAction,
  updateAssessmentAction,
  updateTaskAction,
} from '@/lib/actions/life-actions';
import { ActionForm } from '@/components/life/action-form';
import { EditGoalForm, EditProjectForm } from '@/components/life/entity-edit-forms';
import { setGoalArchiveAction, setProjectArchiveAction } from '@/lib/actions/life-actions';
import { WeightTrend } from '@/components/life/weight-trend';
import { weightTrend } from '@/lib/evidence/summary';

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

export default async function GoalsPage() {
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
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Goals & projects</p>
        <h1 className="text-3xl font-bold tracking-tight">Connect the work to the outcome</h1>
        <p className="text-sm text-muted-foreground">
          Adherence, finished work, and real outcomes stay separate.
        </p>
        <Link
          href="/goals/evidence"
          className="mt-2 inline-block text-sm font-semibold text-primary underline"
        >
          Open evidence & career readiness
        </Link>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-bold">Goals</h2>
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
            {!goals.length && (
              <li className="text-sm text-muted-foreground">
                No goals yet. Start with one meaningful outcome.
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
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-primary">Add a goal</summary>
            <ActionForm
              action={createGoalAction}
              submitLabel="Create goal"
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <label className="text-sm">
                Life area{' '}
                <input
                  name="area"
                  list="life-areas"
                  required
                  defaultValue="University"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
                />
                <datalist id="life-areas">
                  {areas.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </label>
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
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-bold">Projects</h2>
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
            {!projects.length && (
              <li className="text-sm text-muted-foreground">No projects yet.</li>
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
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-primary">Add a project</summary>
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
        </section>
      </div>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-bold">Task backlog</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Pick up to three from this list on Today.
        </p>
        <ul className="grid gap-2 md:grid-cols-2">
          {tasks.map((task) => (
            <li id={`task-${task.id}`} key={task.id} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">
                {task.area}
                {task.projectId
                  ? ` · ${projects.find((project) => project.id === task.projectId)?.name ?? 'Project'}`
                  : ''}
                {task.isMilestone ? ' · Milestone' : ''}
              </p>
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-xs text-muted-foreground">
                {task.status.replace('_', ' ')}
                {task.scheduledDate ? ` · Planned ${task.scheduledDate}` : ''}
                {task.dueDate ? ` · Due ${task.dueDate}` : ''}
              </p>
              <ActionForm
                action={updateTaskAction}
                submitLabel={task.status === 'done' ? 'Reopen' : 'Complete'}
                className="mt-2"
              >
                <input type="hidden" name="id" value={task.id} />
                <input
                  type="hidden"
                  name="status"
                  value={task.status === 'done' ? 'todo' : 'done'}
                />
              </ActionForm>
              <ActionForm
                action={updateTaskAction}
                submitLabel="Log minutes"
                className="mt-2 flex flex-wrap items-end gap-2 text-xs"
              >
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="status" value={task.status} />
                <label>
                  Actual minutes
                  <input
                    type="number"
                    name="actualMinutes"
                    min={0}
                    max={1440}
                    defaultValue={task.actualMinutes ?? ''}
                    className="ml-2 min-h-10 w-24 rounded-lg border bg-background px-2"
                  />
                </label>
              </ActionForm>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-primary">Edit task</summary>
                <ActionForm
                  action={editTaskAction}
                  submitLabel="Save task"
                  className="mt-2 grid gap-2 sm:grid-cols-2"
                >
                  <input type="hidden" name="id" value={task.id} />
                  <label className="text-xs">
                    Title
                    <input
                      name="title"
                      defaultValue={task.title}
                      required
                      maxLength={160}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                    />
                  </label>
                  <label className="text-xs">
                    Area
                    <input
                      name="area"
                      defaultValue={task.area}
                      required
                      maxLength={80}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    Details
                    <textarea
                      name="details"
                      defaultValue={task.details ?? ''}
                      maxLength={4000}
                      className="mt-1 w-full rounded-lg border bg-background p-2"
                    />
                  </label>
                  <label className="text-xs">
                    Project
                    <select
                      name="projectId"
                      defaultValue={task.projectId ?? ''}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                    >
                      <option value="">None</option>
                      {projects.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    Goal
                    <select
                      name="goalId"
                      defaultValue={task.goalId ?? ''}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                    >
                      <option value="">None</option>
                      {goals.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    Estimated minutes
                    <input
                      type="number"
                      name="estimatedMinutes"
                      defaultValue={task.estimatedMinutes ?? ''}
                      min={1}
                      max={1440}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                    />
                  </label>
                  <label className="text-xs">
                    Priority
                    <select
                      name="priority"
                      defaultValue={task.priority}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                    >
                      <option value="1">High</option>
                      <option value="2">Medium</option>
                      <option value="3">Low</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Due date
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={task.dueDate ?? ''}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                    />
                  </label>
                  <label className="text-xs">
                    Planned date
                    <input
                      type="date"
                      name="scheduledDate"
                      defaultValue={task.scheduledDate ?? ''}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="isMilestone" defaultChecked={task.isMilestone} />{' '}
                    Milestone
                  </label>
                </ActionForm>
              </details>
            </li>
          ))}
          {!tasks.length && <li className="text-sm text-muted-foreground">No tasks yet.</li>}
        </ul>
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold text-primary">Add a task</summary>
          <ActionForm
            action={createTaskAction}
            submitLabel="Add task"
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            <label className="text-sm">
              Title{' '}
              <input
                name="title"
                required
                maxLength={160}
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Area{' '}
              <input
                name="area"
                list="task-areas"
                required
                defaultValue="University"
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
              <datalist id="task-areas">
                {areas.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </label>
            <label className="text-sm sm:col-span-2">
              Details{' '}
              <textarea
                name="details"
                maxLength={4000}
                className="mt-1 w-full rounded-lg border bg-background p-3"
              />
            </label>
            <label className="text-sm">
              Project{' '}
              <select
                name="projectId"
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              >
                <option value="">None</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Goal{' '}
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
              Estimated minutes{' '}
              <input
                type="number"
                min="1"
                max="1440"
                name="estimatedMinutes"
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
              Due date{' '}
              <input
                type="date"
                name="dueDate"
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Planned date{' '}
              <input
                type="date"
                name="scheduledDate"
                defaultValue={today}
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isMilestone" /> Project milestone
            </label>
          </ActionForm>
        </details>
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-bold">University subjects</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Five editable slots. Grades are recorded outcomes, never predictions from habits.
        </p>
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
            <summary className="cursor-pointer font-semibold text-primary">Add assessment</summary>
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
  );
}
