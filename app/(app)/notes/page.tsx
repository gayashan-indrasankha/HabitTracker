import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { getJournalPage, getJournalYears, getNoteByUserAndDate } from '@/lib/dal/notes';
import { format } from 'date-fns';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, toDateString } from '@/lib/utils/date';
import { ArrowUpRight, NotebookPen } from 'lucide-react';
import { PastJournalEntry } from '@/components/notes/past-journal-entry';

export const metadata = { title: 'Journal | LifeOS' };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; page?: string }>;
}) {
  const userId = (await requireUser()).id;
  const settings = await getUserSettings(userId);
  const today = getTodayInTimezone(settings.timezone);
  const todayStr = toDateString(today);

  const [todayNote, years] = await Promise.all([
    getNoteByUserAndDate(userId, todayStr),
    getJournalYears(userId, todayStr),
  ]);
  const params = await searchParams;
  const requestedYear = /^\d{4}$/.test(params.year ?? '') ? Number(params.year) : null;
  const selectedYear = years.some((item) => item.year === requestedYear) ? requestedYear : null;
  const requestedPage = /^\d{1,6}$/.test(params.page ?? '') ? Number(params.page) : 1;
  const archive = await getJournalPage(userId, todayStr, selectedYear, requestedPage);
  function archiveHref(year: number | null, page = 1) {
    const query = new URLSearchParams();
    if (year !== null) query.set('year', String(year));
    if (page > 1) query.set('page', String(page));
    return `/notes${query.size ? `?${query}` : ''}#journal-history`;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
        <p className="text-sm text-muted-foreground">
          Your private space to look back on each day.
        </p>
      </div>

      <section
        aria-labelledby="today-note-title"
        className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <NotebookPen aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="today-note-title" className="font-semibold">
                Today’s entry
              </h2>
              <p className="text-sm text-muted-foreground">{format(today, 'MMMM d, yyyy')}</p>
            </div>
          </div>
          <Link
            href="/today?finish=1#finish-your-day"
            className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            {todayNote ? 'Edit today’s entry' : 'Write today’s entry'}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        {todayNote ? (
          <p className="mt-5 whitespace-pre-wrap break-words border-t pt-5 text-sm leading-relaxed">
            {todayNote.content}
          </p>
        ) : (
          <p className="mt-5 rounded-xl bg-muted/50 px-4 py-5 text-sm text-muted-foreground">
            No entry for today yet. Start with a thought, a feeling, or a small win.
          </p>
        )}
      </section>

      <section
        id="journal-history"
        aria-labelledby="past-notes-title"
        className="scroll-mt-24 space-y-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="past-notes-title" className="text-xl font-bold tracking-tight">
            Past entries
          </h2>
          <p className="text-sm text-muted-foreground">
            {archive.total} {archive.total === 1 ? 'entry' : 'entries'}
            {selectedYear !== null ? ` in ${selectedYear}` : ''}
          </p>
        </div>
        {years.length > 0 && (
          <nav aria-label="Browse journal by year" className="flex gap-2 overflow-x-auto pb-1">
            <Link
              href={archiveHref(null)}
              aria-current={selectedYear === null ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${selectedYear === null ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
            >
              All years
            </Link>
            {years.map(({ year }) => (
              <Link
                key={year}
                href={archiveHref(year)}
                aria-current={selectedYear === year ? 'page' : undefined}
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${selectedYear === year ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
              >
                {year}
              </Link>
            ))}
          </nav>
        )}
        {archive.entries.length > 0 ? (
          <div className="space-y-3">
            {archive.entries.map((note) => (
              <PastJournalEntry
                key={note.id}
                id={note.id}
                date={note.date}
                dateLabel={format(new Date(note.date + 'T00:00:00'), 'MMMM d, yyyy')}
                content={note.content}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            Your earlier journal entries will appear here as you keep writing.
          </p>
        )}
        {archive.pages > 1 && (
          <nav
            aria-label="Journal history pages"
            className="flex items-center justify-between gap-3 pt-2"
          >
            {archive.page > 1 ? (
              <Link
                href={archiveHref(selectedYear, archive.page - 1)}
                className="inline-flex min-h-10 items-center rounded-lg border bg-card px-4 text-sm font-medium hover:bg-muted"
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted-foreground">
              Page {archive.page} of {archive.pages}
            </span>
            {archive.page < archive.pages ? (
              <Link
                href={archiveHref(selectedYear, archive.page + 1)}
                className="inline-flex min-h-10 items-center rounded-lg border bg-card px-4 text-sm font-medium hover:bg-muted"
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
