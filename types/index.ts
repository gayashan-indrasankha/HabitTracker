export type HabitSchedule = 'daily' | 'weekdays' | 'weekends' | `custom:${string}`;

export type Theme = 'light' | 'dark' | 'system';

export interface SelectHabit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  monthlyTarget: number;
  schedule: string;
  templateKey: string | null;
  startDate: string;
  endDate: string | null;
  archived: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectHabitEntry {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectDailyNote {
  id: string;
  userId: string;
  date: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectUserSettings {
  userId: string;
  timezone: string;
  weekStartsOn: number;
  theme: string;
}

// Analytics types
export interface CompletionStats {
  rate: number;
  completed: number;
  total: number;
}

export interface DailyProgress {
  date: string;
  count: number;
  total: number;
  rate: number | null;
}

export interface WeeklySummary {
  weekLabel: string;
  rate: number | null;
  completed: number;
  total: number;
}

export interface TopHabit {
  habit: SelectHabit;
  rate: number;
  completed: number;
  total: number;
}

export interface StreakInfo {
  current: number;
  best: number;
}

// Form types
export interface HabitFormValues {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  monthlyTarget: number;
  schedule: string;
  startDate: string;
  endDate?: string;
}
