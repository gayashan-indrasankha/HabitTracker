import Link from 'next/link';
import { ArrowUpRight, NotebookPen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function NotesPreview({ content }: { content: string }) {
  return (
    <Card className="analytics-card">
      <div className="analytics-band flex items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wide">
        <span>Notes</span><NotebookPen className="h-4 w-4" aria-hidden="true" />
      </div>
      <CardContent className="space-y-3">
        {content.trim() ? <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-foreground">{content}</p> : <p className="text-sm leading-6 text-muted-foreground">Capture a win, a thought, or a reminder for today.</p>}
        <Link href="/notes" className="inline-flex items-center gap-1 text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content.trim() ? 'View notes' : 'Write a note'} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </CardContent>
    </Card>
  );
}
