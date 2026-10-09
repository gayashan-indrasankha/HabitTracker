import type { mealTemplates } from '@/lib/db/schema';
import { saveMealTemplateAction, setNutritionEnabledAction } from '@/lib/actions/nutrition-actions';
import { ActionForm } from '@/components/life/action-form';

type Meal = typeof mealTemplates.$inferSelect;

export function NutritionSettings({ enabled, meals }: { enabled: boolean; meals: Meal[] }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Optional meal checklist</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Plan a few meals, then mark followed or not followed on Today. Leaving an item unrecorded
        says nothing about what you ate. Planned nutrition values are references, not consumed
        totals.
      </p>
      <ActionForm
        action={setNutritionEnabledAction}
        submitLabel={enabled ? 'Pause checklist' : 'Enable checklist'}
        className="mt-3"
      >
        <input type="hidden" name="enabled" value={String(!enabled)} />
      </ActionForm>
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">
          Edit meal plan ({meals.length}/5)
        </summary>
        <div className="mt-3 space-y-4">
          {[...meals, ...(meals.length < 5 ? [null] : [])].map((meal) => (
            <ActionForm
              key={meal?.id ?? 'new'}
              action={saveMealTemplateAction}
              submitLabel={meal ? 'Save meal' : 'Add meal'}
              className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2"
            >
              <input type="hidden" name="id" value={meal?.id ?? ''} />
              <label className="text-sm">
                Meal name
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={meal?.name ?? ''}
                  placeholder="Breakfast"
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                />
              </label>
              <label className="text-sm">
                Preferred time (optional)
                <input
                  name="preferredTime"
                  type="time"
                  defaultValue={meal?.preferredTime ?? ''}
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Food/portion notes (optional)
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={500}
                  defaultValue={meal?.notes ?? ''}
                  className="mt-1 w-full rounded-lg border bg-background p-2"
                />
              </label>
              <label className="text-sm">
                Planned kcal (optional)
                <input
                  name="plannedCalories"
                  type="number"
                  min={0}
                  max={6000}
                  defaultValue={meal?.plannedCalories ?? ''}
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                />
              </label>
              <label className="text-sm">
                Planned protein g (optional)
                <input
                  name="plannedProtein"
                  type="number"
                  min={0}
                  max={400}
                  defaultValue={meal?.plannedProtein ?? ''}
                  className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="active" defaultChecked={meal?.active ?? true} />
                Active in Today checklist
              </label>
            </ActionForm>
          ))}
        </div>
      </details>
    </section>
  );
}
