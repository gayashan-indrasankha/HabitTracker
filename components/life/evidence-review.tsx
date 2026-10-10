import Link from 'next/link';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  englishPractices,
  internshipApplications,
  interviewPractices,
  milestoneCriteria,
  milestoneReviews,
  subjectTopics,
  topicPractices,
  subjects,
} from '@/lib/db/schema';
import { topicIndicator, pipelineSummary, canAcceptMilestone } from '@/lib/evidence/summary';
import { addCalendarDays } from '@/lib/planning/time-blocks';

export async function EvidenceReview({
  userId,
  start,
  end,
  today,
}: {
  userId: string;
  start: string;
  end: string;
  today: string;
}) {
  const [topics, academic, grades, reviews, criteria, interviews, english, applications] =
    await Promise.all([
      db.select().from(subjectTopics).where(eq(subjectTopics.userId, userId)),
      db
        .select()
        .from(topicPractices)
        .where(
          and(
            eq(topicPractices.userId, userId),
            gte(topicPractices.date, addCalendarDays(start, -90)),
            lte(topicPractices.date, end),
          ),
        ),
      db.select().from(subjects).where(eq(subjects.userId, userId)),
      db.select().from(milestoneReviews).where(eq(milestoneReviews.userId, userId)),
      db.select().from(milestoneCriteria).where(eq(milestoneCriteria.userId, userId)),
      db
        .select()
        .from(interviewPractices)
        .where(
          and(
            eq(interviewPractices.userId, userId),
            gte(interviewPractices.date, start),
            lte(interviewPractices.date, end),
          ),
        ),
      db
        .select()
        .from(englishPractices)
        .where(
          and(
            eq(englishPractices.userId, userId),
            gte(englishPractices.date, start),
            lte(englishPractices.date, end),
          ),
        ),
      db.select().from(internshipApplications).where(eq(internshipApplications.userId, userId)),
    ]);
  const thisWeek = academic.filter((item) => item.date >= start && item.date <= end);
  const scored = thisWeek.filter((item) => item.correct != null && item.total != null);
  const questions = scored.reduce((sum, item) => sum + item.total!, 0);
  const correct = scored.reduce((sum, item) => sum + item.correct!, 0);
  const weak = topics.filter(
    (topic) =>
      topicIndicator(
        topic.status,
        topic.nextRevisionDate,
        academic.filter((item) => item.topicId === topic.id),
        today,
      ) === 'Needs review',
  );
  const pipeline = pipelineSummary(applications, today);
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="text-xl font-bold">Evidence across goals</h2>
        <Link href="/goals/evidence" className="text-sm text-primary underline">
          Open evidence log
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        This week’s practice is activity; scored results, reviews, grades, and employer stages are
        distinct evidence.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <div className="rounded-xl border p-3">
          <h3 className="font-semibold">University</h3>
          <p>
            {new Set(thisWeek.map((item) => item.topicId)).size} topics practised · {questions}{' '}
            scored questions
            {questions
              ? ` · ${Math.round((correct / questions) * 100)}% recorded accuracy`
              : ' · Not assessed'}
          </p>
          <p>
            {weak.length} topics need review · {grades.filter((item) => item.actualGrade).length}{' '}
            actual grades recorded
          </p>
        </div>
        <div className="rounded-xl border p-3">
          <h3 className="font-semibold">Portfolio quality</h3>
          <p>
            {
              reviews.filter(
                (item) =>
                  item.state === 'meets_criteria' &&
                  canAcceptMilestone(
                    criteria.filter((criterion) => criterion.taskId === item.taskId),
                  ),
              ).length
            }{' '}
            accepted reviews ·{' '}
            {reviews.filter((item) => item.state === 'needs_improvements').length} need improvements
          </p>
          <p className="text-xs text-muted-foreground">Task completion remains separate.</p>
        </div>
        <div className="rounded-xl border p-3">
          <h3 className="font-semibold">Interviews</h3>
          <p>
            {interviews.length} practice sessions ·{' '}
            {interviews.reduce((total, item) => total + (item.durationMinutes ?? 0), 0)} recorded
            minutes
          </p>
          <p className="text-xs text-muted-foreground">
            {new Set(interviews.map((item) => item.topicText ?? item.topicId)).size} topics
            practised this week
          </p>
        </div>
        <div className="rounded-xl border p-3">
          <h3 className="font-semibold">English</h3>
          <p>
            {english.length} practice sessions ·{' '}
            {english.reduce((sum, item) => sum + item.durationMinutes, 0)} recorded minutes
          </p>
        </div>
        <div className="rounded-xl border p-3">
          <h3 className="font-semibold">Internships</h3>
          <p>
            {pipeline.submitted} submitted · {pipeline.active} active · {pipeline.interviews}{' '}
            interview stages · {pipeline.offers} offers
          </p>
          <p>{pipeline.overdue} overdue follow-ups</p>
        </div>
      </div>
    </section>
  );
}
