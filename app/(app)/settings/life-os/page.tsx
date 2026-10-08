import { requireUser } from '@/lib/auth/session';
import { applyLifeTemplateAction } from '@/lib/actions/template-actions';
import { ActionForm } from '@/components/life/action-form';

export const metadata = { title: 'Life OS Setup | HabitFlow' };

const sections = [
  [
    'university',
    'University',
    'Fixed Monday and Tuesday lectures, five blank subject slots, study and recall blocks.',
  ],
  ['industry', 'Industry Project', 'Project and Wednesday/Friday sessions.'],
  [
    'career',
    'SE and DevOps portfolio',
    'Shared core, two projects, practical coding and applied DevOps blocks.',
  ],
  ['interview', 'Interview preparation', 'Two technical practices and a weekly mock.'],
  ['english', 'English', 'Daily practice plus spoken explanation and simulation.'],
  [
    'fitness',
    'Fitness',
    'Four training days and three optional weight check reminders; Sunday recovery.',
  ],
  [
    'nutrition',
    'Nutrition reference',
    'Editable calorie and protein reference, not a meal record.',
  ],
  ['recovery', 'Sleep, reading, meditation', 'Small daily habits and a recovery block.'],
  ['review', 'Weekly review', 'Editable Sunday morning review block.'],
] as const;

export default async function LifeOsSetupPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Optional setup</p>
        <h1 className="text-3xl font-bold tracking-tight">Set up my Life OS</h1>
        <p className="text-sm text-muted-foreground">
          Preview and choose the sections you want. Nothing is added until you apply them. Existing
          edits are kept if you apply again. New settings use Asia/Colombo; saved timezone settings
          stay as they are.
        </p>
      </header>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-bold">Proposed setup</h2>
        <ActionForm
          action={applyLifeTemplateAction}
          submitLabel="Apply selected sections"
          className="mt-4 space-y-5"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {sections.map(([value, label, detail]) => (
              <label key={value} className="flex cursor-pointer gap-3 rounded-xl border p-4">
                <input
                  type="checkbox"
                  name="section"
                  value={value}
                  defaultChecked
                  className="mt-1 h-5 w-5 accent-primary"
                />
                <span>
                  <strong className="block">{label}</strong>
                  <span className="text-sm text-muted-foreground">{detail}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
            <h3 className="font-semibold sm:col-span-2">Editable starting references</h3>
            <label className="text-sm">
              Monday lecture start
              <input
                type="time"
                name="mondayStart"
                defaultValue="08:00"
                required
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Monday lecture end
              <input
                type="time"
                name="mondayEnd"
                defaultValue="18:30"
                required
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Tuesday lecture start
              <input
                type="time"
                name="tuesdayStart"
                defaultValue="08:00"
                required
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Tuesday lecture end
              <input
                type="time"
                name="tuesdayEnd"
                defaultValue="15:00"
                required
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Starting calorie reference
              <input
                type="number"
                name="calories"
                defaultValue="3207"
                min="1000"
                max="6000"
                required
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Starting protein reference (g)
              <input
                type="number"
                name="protein"
                defaultValue="157"
                min="20"
                max="400"
                required
                className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Lecture travel buffers are intentionally blank. Times, habits, tasks, and goals can be
              adjusted after setup. No sensitive behavior tracking is created.
            </p>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
