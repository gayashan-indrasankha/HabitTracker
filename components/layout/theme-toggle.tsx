'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { updateThemePreferenceAction } from '@/lib/actions/settings-actions';

export function ThemeToggle({ savedTheme }: { savedTheme: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const initialSyncDone = useRef(false);

  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setTheme(savedTheme);
    }
  }, [savedTheme, setTheme]);

  async function toggle() {
    const previous = resolvedTheme === 'dark' ? 'dark' : 'light';
    const next = previous === 'dark' ? 'light' : 'dark';
    setError('');
    setTheme(next);
    setPending(true);
    try {
      const result = await updateThemePreferenceAction(next);
      if (result.error) throw new Error(result.error);
    } catch {
      setTheme(previous);
      setError('Could not save theme. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-10 z-50 w-48 rounded-lg border bg-card p-2 text-xs text-destructive shadow-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
