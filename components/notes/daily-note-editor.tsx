'use client';

import { useActionState, useRef, useState } from 'react';
import { upsertNoteAction, type NoteActionState } from '@/lib/actions/note-actions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface DailyNoteEditorProps {
  date: string;
  initialContent: string;
}

const journalPrompts = ['What went well today?', 'What felt difficult?', 'What am I grateful for?'];

export function DailyNoteEditor({ date, initialContent }: DailyNoteEditorProps) {
  const [editedSinceSave, setEditedSinceSave] = useState(false);
  const [changedSinceSubmit, setChangedSinceSubmit] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  async function save(state: NoteActionState, form: FormData): Promise<NoteActionState> {
    const result = await upsertNoteAction(state, form);
    if (result.success) setEditedSinceSave(false);
    return result;
  }
  const [state, formAction, isPending] = useActionState(save, {});
  const isSaved = !editedSinceSave && (Boolean(initialContent.trim()) || Boolean(state.success));

  function addPrompt(prompt: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (!textarea.value.includes(prompt)) {
      const content = textarea.value.trimEnd();
      textarea.value = `${content}${content ? '\n\n' : ''}${prompt}\n`;
      setEditedSinceSave(true);
      setChangedSinceSubmit(true);
    }
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  return (
    <form action={formAction} onSubmit={() => setChangedSinceSubmit(false)} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <label htmlFor="daily-note" className="block text-sm font-medium">
        Your journal entry
      </label>
      <div className="flex flex-wrap gap-2" aria-label="Journal prompts">
        {journalPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => addPrompt(prompt)}
            className="min-h-9 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            {prompt}
          </button>
        ))}
      </div>
      <Textarea
        ref={textareaRef}
        id="daily-note"
        name="content"
        defaultValue={initialContent}
        placeholder="Write freely about your day…"
        rows={6}
        className="min-h-36 resize-y rounded-xl bg-background p-3 leading-relaxed"
        aria-label="Daily journal entry"
        onChange={() => {
          setEditedSinceSave(true);
          setChangedSinceSubmit(true);
        }}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          type="submit"
          variant={isSaved ? 'outline' : 'default'}
          disabled={isPending || isSaved}
          className="min-h-10 min-w-28 rounded-lg disabled:opacity-100"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : isSaved ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : null}
          {isPending ? 'Saving…' : isSaved ? 'Saved' : 'Save entry'}
        </Button>

        {state.success && isSaved && !isPending && (
          <span role="status" className="sr-only">
            Journal entry saved
          </span>
        )}

        {state.error && !changedSinceSubmit && !isPending && (
          <span role="alert" className="text-xs text-destructive">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
