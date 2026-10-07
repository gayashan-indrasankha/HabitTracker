import { requireUser } from '@/lib/auth/session';
import { getAllNotesByUser } from '@/lib/dal/notes';
import { DailyNoteEditor } from '@/components/notes/daily-note-editor';
import { format } from 'date-fns';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import { NotebookPen } from 'lucide-react';

export default async function NotesPage() {
  const userId = (await requireUser()).id;
  const settings = await getUserSettings(userId);
  const today = getTodayInTimezone(settings.timezone);
  const todayStr = toDateString(today);

  const notes = await getAllNotesByUser(userId);
  const todayNote = notes.find((n) => n.date === todayStr);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground">
          Capture thoughts, reflections and daily insights
        </p>
      </div>

      {/* Today's note editor */}
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <NotebookPen className="h-4 w-4" />
          Today — {format(today, 'MMMM d, yyyy')}
        </h2>
        <DailyNoteEditor
          date={todayStr}
          initialContent={todayNote?.content ?? ''}
        />
      </div>

      {/* Past notes */}
      {notes.filter((n) => n.date !== todayStr).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Past Notes
          </h2>
          {notes
            .filter((n) => n.date !== todayStr)
            .map((note) => (
              <div
                key={note.id}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {format(new Date(note.date + 'T00:00:00'), 'MMMM d, yyyy')}
                </p>
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
              </div>
            ))}
        </div>
      )}

      {notes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
          <NotebookPen className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Write your first note above to get started.
          </p>
        </div>
      )}
    </div>
  );
}
