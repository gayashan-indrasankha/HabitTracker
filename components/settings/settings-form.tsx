'use client';

import { useState, type FormEvent } from 'react';
import { useTheme } from 'next-themes';
import { CalendarDays, CheckCircle2, Loader2, Palette } from 'lucide-react';
import { updateSettingsAction } from '@/lib/actions/settings-actions';
import type { SettingsActionState } from '@/lib/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Colombo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const WEEK_START_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '0', label: 'Sunday' },
  { value: '6', label: 'Saturday' },
];

const THEME_OPTIONS = [
  { value: 'system', label: 'System default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

interface SettingsFormProps {
  defaultValues: {
    timezone: string;
    weekStartsOn: number;
    theme: string;
  };
}

const initialState: SettingsActionState = {};

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [state, setState] = useState<SettingsActionState>(initialState);
  const [isPending, setIsPending] = useState(false);
  const { setTheme: setAppTheme } = useTheme();
  const [timezone, setTimezone] = useState(defaultValues.timezone);
  const [weekStartsOn, setWeekStartsOn] = useState(String(defaultValues.weekStartsOn));
  const [theme, setTheme] = useState(defaultValues.theme);
  const [changedSinceSubmit, setChangedSinceSubmit] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedTheme = theme;
    setState({});
    setChangedSinceSubmit(false);
    setIsPending(true);
    try {
      const result = await updateSettingsAction({}, formData);
      setState(result);
      if (result.success) setAppTheme(submittedTheme);
    } catch {
      setState({ error: 'Could not save settings. Try again.' });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="weekStartsOn" value={weekStartsOn} />
      <input type="hidden" name="theme" value={theme} />

      <div className="border-b px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold tracking-tight">Preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how dates, weeks and colours appear across LifeOS.
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-0 lg:divide-x">
        <section className="min-w-0 lg:pr-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold">Time & Calendar</h3>
              <p className="text-xs text-muted-foreground">Dates and weekly views</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="timezone-select">Timezone</Label>
              <Select
                value={timezone}
                onValueChange={(value) => {
                  setTimezone(value);
                  setChangedSinceSubmit(true);
                }}
              >
                <SelectTrigger id="timezone-select" className="min-h-11 w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="week-start-select">Week Starts On</Label>
              <Select
                value={weekStartsOn}
                onValueChange={(value) => {
                  setWeekStartsOn(value);
                  setChangedSinceSubmit(true);
                }}
              >
                <SelectTrigger id="week-start-select" className="min-h-11 w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_START_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="min-w-0 border-t pt-5 lg:border-t-0 lg:py-0 lg:pl-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Palette aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold">Appearance</h3>
              <p className="text-xs text-muted-foreground">Choose a theme</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theme-select">Theme</Label>
            <Select
              value={theme}
              onValueChange={(value) => {
                setTheme(value);
                setChangedSinceSubmit(true);
              }}
            >
              <SelectTrigger id="theme-select" className="min-h-11 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>
      </div>

      {(state.error || state.fieldErrors) && !changedSinceSubmit && !isPending && (
        <div
          role="alert"
          className="mx-5 mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-6"
        >
          {state.error ??
            Object.values(state.fieldErrors ?? {})
              .flat()
              .join(' ')}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t bg-muted/30 px-5 py-4 sm:px-6">
        <Button type="submit" disabled={isPending} className="min-h-11 px-5">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
        {state.success && !isPending && !changedSinceSubmit && (
          <span role="status" className="flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved successfully
          </span>
        )}
      </div>
    </form>
  );
}
