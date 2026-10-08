'use client';

import { useActionState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

// Common IANA timezones
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
  const [state, formAction, isPending] = useActionState(
    updateSettingsAction,
    initialState,
  );

  const [timezone, setTimezone] = useState(defaultValues.timezone);
  const [weekStartsOn, setWeekStartsOn] = useState(
    String(defaultValues.weekStartsOn),
  );
  const [theme, setTheme] = useState(defaultValues.theme);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="weekStartsOn" value={weekStartsOn} />
      <input type="hidden" name="theme" value={theme} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time & Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="timezone-select">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone-select">
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

          <div className="space-y-1.5">
            <Label htmlFor="week-start-select">Week Starts On</Label>
            <Select value={weekStartsOn} onValueChange={setWeekStartsOn}>
              <SelectTrigger id="week-start-select">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="theme-select">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme-select">
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
        </CardContent>
      </Card>

      {state.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>

        {state.success && !isPending && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved successfully
          </span>
        )}
      </div>
    </form>
  );
}
