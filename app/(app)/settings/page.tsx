import { requireUser } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/dal/user-settings';
import { SettingsForm } from '@/components/settings/settings-form';
import Link from 'next/link';

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Personalise your HabitFlow experience
        </p>
      </div>

      <SettingsForm defaultValues={settings} />
      <section className="space-y-3 rounded-2xl border bg-card p-5"><h2 className="text-lg font-semibold">Personal setup and backup</h2><p className="text-sm text-muted-foreground">Start from an editable example, or download a versioned JSON backup of your productivity data. The backup includes private notes and reviews; keep the file somewhere you trust.</p><div className="flex flex-wrap gap-3"><Link href="/settings/life-os" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Set up my Life OS</Link><a href="/api/export" download className="rounded-lg border px-4 py-2 text-sm font-semibold">Export my data</a></div></section>
    </div>
  );
}
