'use client';

import { useActionState, useRef } from 'react';
import { upsertNoteAction } from '@/lib/actions/note-actions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface DailyNoteEditorProps {
  date: string;
  initialContent: string;
}

export function DailyNoteEditor({ date, initialContent }: DailyNoteEditorProps) {
  const [state, formAction, isPending] = useActionState(upsertNoteAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <Textarea
        name="content"
        defaultValue={initialContent}
        placeholder="What's on your mind today? Wins, reflections, goals…"
        rows={5}
        className="resize-none"
        aria-label="Daily note"
      />

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : null}
          Save Note
        </Button>

        {state.success && !isPending && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved
          </span>
        )}

        {state.error && (
          <span className="text-xs text-destructive">{state.error}</span>
        )}
      </div>
    </form>
  );
}
