import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { SettingsForm } from '@/components/settings/settings-form';
import { NutritionSettings } from '@/components/nutrition/nutrition-settings';
import { getMealTemplates } from '@/lib/dal/nutrition';
import Link from 'next/link';
import { DatabaseBackup } from 'lucide-react';

export const metadata = { title: 'Settings | LifeOS' };

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const meals = await getMealTemplates(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <header>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Your space
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalise your LifeOS experience</p>
      </header>

      <SettingsForm defaultValues={settings} />
      <NutritionSettings enabled={settings.nutritionEnabled} meals={meals} />
      <section className="flex flex-wrap items-start justify-between gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DatabaseBackup aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Personal setup and backup</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Start from an editable example, or download a versioned JSON backup of your
              productivity data. The backup includes private notes and reviews; keep the file
              somewhere you trust.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/life-os"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Set up my LifeOS
          </Link>
          <a
            href="/api/export"
            download
            className="inline-flex min-h-11 items-center rounded-lg border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Export my data
          </a>
        </div>
      </section>
    </div>
  );
}
