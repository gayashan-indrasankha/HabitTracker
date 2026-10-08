'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { UserSettingsSchema } from '@/lib/validations/settings';
import { getUserSettings, upsertUserSettings } from '@/lib/dal/user-settings';

export type SettingsActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function updateSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  const userId = user.id;

  const raw = {
    timezone: formData.get('timezone'),
    weekStartsOn: Number(formData.get('weekStartsOn')),
    theme: formData.get('theme'),
  };

  const parsed = UserSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[key] = messages ?? [];
    }
    return { fieldErrors };
  }

  await upsertUserSettings(userId, parsed.data);
  return { success: true };
}

export async function updateThemePreferenceAction(theme: string): Promise<SettingsActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  if (theme !== 'light' && theme !== 'dark') return { error: 'Invalid theme.' };

  const current = await getUserSettings(user.id);
  await upsertUserSettings(user.id, {
    timezone: current.timezone,
    weekStartsOn: current.weekStartsOn,
    theme,
  });
  return { success: true };
}
