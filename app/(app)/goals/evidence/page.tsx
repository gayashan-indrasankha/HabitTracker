import Link from 'next/link';
import { and, asc, desc, eq, gte } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  applicationStageHistory,
  englishPractices,
  grammarMistakes,
  internshipApplications,
  interviewPractices,
  interviewTopics,
  metricEntries,
  milestoneCriteria,
  milestoneReviewHistory,
  milestoneReviews,
  subjectTopics,
  topicPractices,
} from '@/lib/db/schema';
import { getGoals, getProjects, getSubjects, getTasks } from '@/lib/dal/life';
import { getUserSettings } from '@/lib/dal/user-settings';
import { getTodayInTimezone, toDateString, toZonedTime } from '@/lib/utils/date';
import { addCalendarDays } from '@/lib/planning/time-blocks';
import {
  pipelineSummary,
  topicIndicator,
  weightTrend,
  interviewWeak,
  canAcceptMilestone,
  englishRatingTrend,
} from '@/lib/evidence/summary';
import { ActionForm } from '@/components/life/action-form';
import { WeightTrend } from '@/components/life/weight-trend';
import {
  addEnglishPracticeAction,
  addGrammarMistakeAction,
  addInterviewPracticeAction,
  addInterviewTopicAction,
  addTopicPracticeAction,
  addWeightAction,
  changeApplicationStageAction,
  changeWeightAction,
  createApplicationFollowUpAction,
  createInterviewFollowUpAction,
  reviewGrammarMistakeAction,
  saveApplicationAction,
  saveCriterionAction,
  saveMilestoneReviewAction,
  saveTopicAction,
} from '@/lib/actions/evidence-actions';

export const metadata = { title: 'Evidence & Career Readiness | LifeOS' };

const field = 'mt-1 min-h-10 w-full rounded-lg border bg-background px-2';
const label = 'block text-sm';
const stages = [
  ['saved', 'Saved'],
  ['applied', 'Applied'],
  ['online_assessment', 'Online assessment'],
  ['technical_interview', 'Technical interview'],
  ['hr_interview', 'HR interview'],
  ['offer', 'Offer'],
  ['rejected', 'Rejected'],
  ['withdrawn', 'Withdrawn'],
  ['custom', 'Other stage'],
] as const;
const topicStates = [
  ['not_started', 'Not started'],
  ['learning', 'Learning'],
  ['practising', 'Practising'],
  ['demonstrated_mastery', 'Demonstrated mastery'],
  ['needs_revision', 'Needs revision'],
] as const;

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; stage?: string }>;
}) {
  const userId = (await requireUser()).id;
  const settings = await getUserSettings(userId);
  const today = toDateString(getTodayInTimezone(settings.timezone));
  const localDate = (instant: Date) => toDateString(toZonedTime(instant, settings.timezone));
  const since = addCalendarDays(today, -180);
  const weightSince = addCalendarDays(today, -365);
  const query = await searchParams;
  const [
    subjects,
    goals,
    projects,
    tasks,
    topics,
    practices,
    criteria,
    reviews,
    reviewHistory,
    interviewCatalog,
    interviews,
    english,
    mistakes,
    weights,
    firstWeight,
    applications,
    history,
  ] = await Promise.all([
    getSubjects(userId),
    getGoals(userId),
    getProjects(userId),
    getTasks(userId),
    db
      .select()
      .from(subjectTopics)
      .where(eq(subjectTopics.userId, userId))
      .orderBy(asc(subjectTopics.priority), asc(subjectTopics.title)),
    db
      .select()
      .from(topicPractices)
      .where(and(eq(topicPractices.userId, userId), gte(topicPractices.date, since)))
      .orderBy(desc(topicPractices.date))
      .limit(500),
    db.select().from(milestoneCriteria).where(eq(milestoneCriteria.userId, userId)),
    db.select().from(milestoneReviews).where(eq(milestoneReviews.userId, userId)),
    db
      .select()
      .from(milestoneReviewHistory)
      .where(eq(milestoneReviewHistory.userId, userId))
      .orderBy(desc(milestoneReviewHistory.createdAt))
      .limit(100),
    db
      .select()
      .from(interviewTopics)
      .where(eq(interviewTopics.userId, userId))
      .orderBy(asc(interviewTopics.category), asc(interviewTopics.title)),
    db
      .select()
      .from(interviewPractices)
      .where(and(eq(interviewPractices.userId, userId), gte(interviewPractices.date, since)))
      .orderBy(desc(interviewPractices.date))
      .limit(200),
    db
      .select()
      .from(englishPractices)
      .where(and(eq(englishPractices.userId, userId), gte(englishPractices.date, since)))
      .orderBy(desc(englishPractices.date))
      .limit(200),
    db
      .select()
      .from(grammarMistakes)
      .where(eq(grammarMistakes.userId, userId))
      .orderBy(desc(grammarMistakes.createdAt))
      .limit(100),
    db
      .select()
      .from(metricEntries)
      .where(
        and(
          eq(metricEntries.userId, userId),
          eq(metricEntries.type, 'Body weight'),
          eq(metricEntries.unit, 'kg'),
          gte(metricEntries.date, weightSince),
        ),
      )
      .orderBy(desc(metricEntries.date), desc(metricEntries.createdAt))
      .limit(400),
    db
      .select()
      .from(metricEntries)
      .where(
        and(
          eq(metricEntries.userId, userId),
          eq(metricEntries.type, 'Body weight'),
          eq(metricEntries.unit, 'kg'),
        ),
      )
      .orderBy(asc(metricEntries.date), asc(metricEntries.createdAt))
      .limit(1),
    db
      .select()
      .from(internshipApplications)
      .where(eq(internshipApplications.userId, userId))
      .orderBy(desc(internshipApplications.updatedAt))
      .limit(300),
    db
      .select()
      .from(applicationStageHistory)
      .where(eq(applicationStageHistory.userId, userId))
      .orderBy(desc(applicationStageHistory.changedAt))
      .limit(150),
  ]);
  const namedSubjects = subjects.filter((item) => item.name);
  const milestones = tasks.filter((item) => item.isMilestone && item.projectId);
  const fitnessGoal = goals.find(
    (item) => item.area === 'Fitness' && item.targetUnit === 'kg' && !item.archivedAt,
  );
  const target = fitnessGoal?.targetValue ?? null;
  const trend = weightTrend(
    weights.map((item) => ({ date: item.date, value: item.value })),
    settings.weekStartsOn,
    target,
    firstWeight[0] ? { date: firstWeight[0].date, value: firstWeight[0].value } : null,
  );
  const pipeline = pipelineSummary(applications, today);
  const filteredApplications = applications.filter(
    (item) =>
      (!query.track || item.roleTrack === query.track) &&
      (!query.stage || item.stage === query.stage),
  );
  const recentWeakTopic = topics.find(
    (item) =>
      topicIndicator(
        item.status,
        item.nextRevisionDate,
        practices.filter((practice) => practice.topicId === item.id),
        today,
      ) === 'Needs review',
  );
  const recentInterviewWeak = interviews.find(interviewWeak);
  const englishTrends = englishRatingTrend(english);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <Link href="/goals" className="text-sm text-primary underline">
          ← Goals & Projects
        </Link>
        <h1 className="text-3xl font-bold">Evidence & career readiness</h1>
        <p className="text-sm text-muted-foreground">
          Practice, completed work, and demonstrated outcomes are shown separately. Missing evidence
          means not assessed.
        </p>
        <nav
          aria-label="Evidence sections"
          className="flex flex-wrap gap-2 text-sm text-primary underline"
        >
          <a href="#university">University</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#interviews">Interviews</a>
          <a href="#english">English</a>
          <a href="#weight">Body weight</a>
          <a href="#applications">Applications</a>
        </nav>
      </header>

      <section
        id="university"
        className="scroll-mt-32 space-y-4 rounded-2xl border bg-card p-5 lg:scroll-mt-20"
      >
        <div>
          <h2 className="text-xl font-bold">University topic mastery</h2>
          <p className="text-sm text-muted-foreground">
            Actual grades stay in Goals. Practice scores and self-confidence provide separate
            learning evidence.
          </p>
        </div>
        {namedSubjects.length ? (
          <details>
            <summary className="cursor-pointer font-semibold text-primary">Add topic</summary>
            <ActionForm
              action={saveTopicAction}
              submitLabel="Save topic"
              className="mt-3 grid gap-3 sm:grid-cols-3"
            >
              <select name="subjectId" aria-label="Subject" required className={field}>
                {namedSubjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <label className={label}>
                Topic
                <input name="title" required maxLength={160} className={field} />
              </label>
              <label className={label}>
                Priority
                <select name="priority" defaultValue="2" className={field}>
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </select>
              </label>
              <input type="hidden" name="status" value="not_started" />
              <input type="hidden" name="nextRevisionDate" value="" />
            </ActionForm>
          </details>
        ) : (
          <p className="text-sm">
            Name a subject in{' '}
            <Link href="/goals" className="text-primary underline">
              Goals
            </Link>{' '}
            first.
          </p>
        )}
        {recentWeakTopic && (
          <p className="rounded-lg border border-amber-500/50 p-3 text-sm">
            Next revision: {recentWeakTopic.title}. Its scored practice or revision date needs
            attention.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {topics.map((topic) => {
            const attempts = practices.filter((item) => item.topicId === topic.id);
            const indicator = topicIndicator(topic.status, topic.nextRevisionDate, attempts, today);
            const scored = attempts.filter((item) => item.correct != null && item.total != null);
            return (
              <article key={topic.id} className="rounded-xl border p-3 text-sm space-y-2">
                <h3 className="font-semibold">{topic.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {subjects.find((item) => item.id === topic.subjectId)?.name} · {indicator} ·{' '}
                  {attempts.length} recent attempts
                  {topic.nextRevisionDate ? ` · Revise ${topic.nextRevisionDate}` : ''}
                </p>
                <p className="text-xs">
                  {scored.length
                    ? `Latest score ${scored[0].correct}/${scored[0].total} (${Math.round((scored[0].correct! / scored[0].total!) * 100)}%)`
                    : 'No scored retrieval yet'}{' '}
                  · Actual grade:{' '}
                  {subjects.find((item) => item.id === topic.subjectId)?.actualGrade ||
                    'Not recorded'}
                </p>
                <details>
                  <summary className="cursor-pointer text-primary">Edit topic and revision</summary>
                  <ActionForm
                    action={saveTopicAction}
                    submitLabel="Update topic"
                    className="mt-2 grid gap-2 sm:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={topic.id} />
                    <input type="hidden" name="subjectId" value={topic.subjectId} />
                    <label className={label}>
                      Topic
                      <input name="title" defaultValue={topic.title} required className={field} />
                    </label>
                    <label className={label}>
                      Priority
                      <select name="priority" defaultValue={topic.priority} className={field}>
                        <option value="1">High</option>
                        <option value="2">Medium</option>
                        <option value="3">Low</option>
                      </select>
                    </label>
                    <label className={label}>
                      Learning status
                      <select name="status" defaultValue={topic.status} className={field}>
                        {topicStates.map(([key, text]) => (
                          <option key={key} value={key}>
                            {text}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={label}>
                      Next revision
                      <input
                        type="date"
                        name="nextRevisionDate"
                        defaultValue={topic.nextRevisionDate ?? ''}
                        className={field}
                      />
                    </label>
                  </ActionForm>
                </details>
                <details>
                  <summary className="cursor-pointer text-primary">Record practice</summary>
                  <ActionForm
                    action={addTopicPracticeAction}
                    submitLabel="Record practice"
                    className="mt-2 grid gap-2 sm:grid-cols-2"
                  >
                    <input type="hidden" name="topicId" value={topic.id} />
                    <label className={label}>
                      Date
                      <input
                        type="date"
                        name="date"
                        defaultValue={today}
                        required
                        className={field}
                      />
                    </label>
                    <label className={label}>
                      Practice type
                      <select name="type" className={field}>
                        <option value="active_recall">Active recall</option>
                        <option value="quiz">Quiz</option>
                        <option value="past_paper">Past-paper question</option>
                        <option value="problem_solving">Problem solving</option>
                        <option value="explanation">Explanation without notes</option>
                      </select>
                    </label>
                    <label className={label}>
                      Correct (optional)
                      <input type="number" name="correct" min="0" className={field} />
                    </label>
                    <label className={label}>
                      Total (optional)
                      <input type="number" name="total" min="1" className={field} />
                    </label>
                    <label className={label}>
                      Confidence, self-rated 1–5
                      <input type="number" name="confidence" min="1" max="5" className={field} />
                    </label>
                    <label className={label}>
                      Minutes (optional)
                      <input type="number" name="durationMinutes" min="1" className={field} />
                    </label>
                    <label className={`${label} sm:col-span-2`}>
                      Evidence note
                      <input name="note" maxLength={1000} className={field} />
                    </label>
                  </ActionForm>
                </details>
              </article>
            );
          })}
        </div>
        {!topics.length && <p className="text-sm text-muted-foreground">No topics assessed yet.</p>}
      </section>

      <section
        id="portfolio"
        className="scroll-mt-32 space-y-3 rounded-2xl border bg-card p-5 lg:scroll-mt-20"
      >
        <div>
          <h2 className="text-xl font-bold">Portfolio milestone quality</h2>
          <p className="text-sm text-muted-foreground">
            A completed task is output; acceptance is a separate review against criteria you define.
          </p>
        </div>
        <p className="text-sm">
          {milestones.filter((item) => item.status === 'done').length} completed ·{' '}
          {
            reviews.filter(
              (item) =>
                item.state === 'meets_criteria' &&
                canAcceptMilestone(
                  criteria.filter((criterion) => criterion.taskId === item.taskId),
                ),
            ).length
          }{' '}
          accepted · {reviews.filter((item) => item.state === 'needs_improvements').length} need
          improvements
        </p>
        {milestones.map((task) => {
          const items = criteria.filter((item) => item.taskId === task.id);
          const review = reviews.find((item) => item.taskId === task.id);
          const needsRereview = review?.state === 'meets_criteria' && !canAcceptMilestone(items);
          return (
            <article key={task.id} className="rounded-xl border p-3 space-y-2 text-sm">
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-xs text-muted-foreground">
                {projects.find((item) => item.id === task.projectId)?.name} · Task {task.status} ·
                Quality{' '}
                {needsRereview
                  ? 'needs re-review'
                  : (review?.state.replaceAll('_', ' ') ?? 'not reviewed')}{' '}
                · Criteria {items.filter((item) => item.met).length}/{items.length}
              </p>
              <details>
                <summary className="cursor-pointer text-primary">Criteria and review</summary>
                <div className="mt-2 space-y-2">
                  {items.map((item) => (
                    <ActionForm
                      key={item.id}
                      action={saveCriterionAction}
                      submitLabel="Update criterion"
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <label className={label}>
                        Criterion
                        <input
                          name="title"
                          defaultValue={item.title}
                          required
                          maxLength={200}
                          className={field}
                        />
                      </label>
                      <label className="flex gap-2 text-sm">
                        <input type="checkbox" name="met" defaultChecked={item.met} /> Met after
                        review
                      </label>
                    </ActionForm>
                  ))}
                  <ActionForm
                    action={saveCriterionAction}
                    submitLabel="Add criterion"
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="taskId" value={task.id} />
                    <label className={label}>
                      Custom acceptance criterion
                      <input
                        name="title"
                        required
                        maxLength={200}
                        placeholder="Authorization tests pass"
                        className={field}
                      />
                    </label>
                  </ActionForm>
                  {reviewHistory.filter((item) => item.taskId === task.id).length > 0 && (
                    <details>
                      <summary className="cursor-pointer text-primary">
                        Earlier quality reviews
                      </summary>
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {reviewHistory
                          .filter((item) => item.taskId === task.id)
                          .map((item) => (
                            <li key={item.id}>
                              {item.reviewedOn ?? localDate(item.createdAt)} ·{' '}
                              {item.state.replaceAll('_', ' ')} · {item.reviewer} · Criteria
                              snapshot: {item.criteriaSnapshot}
                            </li>
                          ))}
                      </ul>
                    </details>
                  )}
                  <ActionForm
                    action={saveMilestoneReviewAction}
                    submitLabel="Save quality review"
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    <input type="hidden" name="taskId" value={task.id} />
                    <label className={label}>
                      Review state
                      <select
                        name="state"
                        defaultValue={review?.state ?? 'not_reviewed'}
                        className={field}
                      >
                        <option value="not_reviewed">Not reviewed</option>
                        <option value="needs_improvements">Needs improvements</option>
                        <option value="meets_criteria">Meets defined criteria</option>
                      </select>
                    </label>
                    <label className={label}>
                      Reviewer label
                      <input
                        name="reviewer"
                        defaultValue={review?.reviewer ?? 'Self-review'}
                        required
                        className={field}
                      />
                    </label>
                    <label className={label}>
                      Review date
                      <input
                        type="date"
                        name="reviewedOn"
                        defaultValue={review?.reviewedOn ?? today}
                        className={field}
                      />
                    </label>
                    <label className={label}>
                      Repository/PR URL
                      <input
                        type="url"
                        name="repositoryUrl"
                        defaultValue={review?.repositoryUrl ?? ''}
                        className={field}
                      />
                    </label>
                    <label className={label}>
                      Test run reference
                      <input
                        name="testReference"
                        defaultValue={review?.testReference ?? ''}
                        className={field}
                      />
                    </label>
                    <label className={label}>
                      Documentation URL
                      <input
                        type="url"
                        name="documentationUrl"
                        defaultValue={review?.documentationUrl ?? ''}
                        className={field}
                      />
                    </label>
                    <label className={`${label} sm:col-span-2`}>
                      Implementation note
                      <input name="note" defaultValue={review?.note ?? ''} className={field} />
                    </label>
                  </ActionForm>
                </div>
              </details>
            </article>
          );
        })}
        {!milestones.length && (
          <p className="text-sm text-muted-foreground">
            Mark a project task as a milestone in Goals to review its quality.
          </p>
        )}
      </section>

      <section
        id="interviews"
        className="scroll-mt-32 space-y-3 rounded-2xl border bg-card p-5 lg:scroll-mt-20"
      >
        <h2 className="text-xl font-bold">Technical interview practice</h2>
        <p className="text-sm text-muted-foreground">
          Rubric: 1 = cannot yet explain or solve; 3 = partly correct with prompting; 5 = accurate,
          clear, and independent. Ratings are self-assessed unless an external score is explicitly
          entered. No pass prediction is made.
        </p>
        {recentInterviewWeak && (
          <p className="rounded-lg border border-amber-500/50 p-3 text-sm">
            Suggested next practice:{' '}
            {interviewCatalog.find((item) => item.id === recentInterviewWeak.topicId)?.title}.
            Reason: recorded weakness or a self-rating of 1–2.
          </p>
        )}
        <details>
          <summary className="cursor-pointer font-semibold text-primary">
            Add interview topic
          </summary>
          <ActionForm
            action={addInterviewTopicAction}
            submitLabel="Add topic"
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            <label className={label}>
              Category
              <input name="category" required placeholder="SQL / DBMS" className={field} />
            </label>
            <label className={label}>
              Topic
              <input name="title" required className={field} />
            </label>
            <label className={label}>
              Role
              <select name="roleTrack" className={field}>
                <option>Shared</option>
                <option>SE</option>
                <option>DevOps</option>
                <option>QA</option>
              </select>
            </label>
          </ActionForm>
        </details>
        {interviewCatalog.length ? (
          <details>
            <summary className="cursor-pointer font-semibold text-primary">
              Record interview practice
            </summary>
            <ActionForm
              action={addInterviewPracticeAction}
              submitLabel="Record interview practice"
              className="mt-2 grid gap-2 sm:grid-cols-3"
            >
              <label className={label}>
                Date
                <input type="date" name="date" defaultValue={today} required className={field} />
              </label>
              <label className={label}>
                Target role
                <select name="roleTrack" className={field}>
                  <option>SE</option>
                  <option>DevOps</option>
                  <option>QA</option>
                </select>
              </label>
              <label className={label}>
                Topic
                <select name="topicId" className={field}>
                  {interviewCatalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.category}: {item.title} ({item.roleTrack})
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                Practice type
                <select name="type" className={field}>
                  <option value="mock">Mock interview</option>
                  <option value="technical_question">Technical question</option>
                  <option value="coding">Coding</option>
                  <option value="explanation">Project explanation</option>
                </select>
              </label>
              <label className={label}>
                Minutes
                <input type="number" name="durationMinutes" min="1" className={field} />
              </label>
              <label className={label}>
                Question/prompt
                <input name="prompt" className={field} />
              </label>
              <label className={label}>
                Correct answers (scored practice only)
                <input type="number" name="correct" min="0" className={field} />
              </label>
              <label className={label}>
                Total questions (scored practice only)
                <input type="number" name="total" min="1" className={field} />
              </label>
              {(['technical', 'approach', 'clarity', 'tradeoffs', 'externalRating'] as const).map(
                (key) => (
                  <label key={key} className={label}>
                    {key === 'externalRating'
                      ? 'External rating, if supplied'
                      : `Self-rated ${key} (1–5)`}
                    <input type="number" name={key} min="1" max="5" className={field} />
                  </label>
                ),
              )}
              <label className={label}>
                Strengths
                <input name="strengths" className={field} />
              </label>
              <label className={label}>
                Weaknesses
                <input name="weaknesses" className={field} />
              </label>
              <label className={label}>
                Next action
                <input name="nextAction" className={field} />
              </label>
            </ActionForm>
          </details>
        ) : (
          <p className="text-sm">Add an editable topic first.</p>
        )}
        <p className="text-sm">
          {new Set(interviews.map((item) => item.topicId)).size} topics practised in the recent 180
          days ·{' '}
          {
            interviewCatalog.filter(
              (item) => !interviews.some((session) => session.topicId === item.id),
            ).length
          }{' '}
          not yet assessed.
        </p>
        <div className="space-y-2">
          {interviews.slice(0, 8).map((item) => (
            <article key={item.id} className="rounded-xl border p-3 text-sm">
              <p className="font-semibold">
                {item.date} · {interviewCatalog.find((topic) => topic.id === item.topicId)?.title} ·{' '}
                {item.roleTrack}
              </p>
              <p>
                Self-assessed technical {item.technical ?? 'Not assessed'}/5 · clarity{' '}
                {item.clarity ?? 'Not assessed'}/5
                {item.externalRating != null ? ` · External rating ${item.externalRating}/5` : ''}
              </p>
              {item.correct != null && item.total != null && (
                <p>
                  Recorded result: {item.correct}/{item.total} correct
                </p>
              )}
              {item.weaknesses && <p>Weakness: {item.weaknesses}</p>}
              {item.nextAction && <p>Next: {item.nextAction}</p>}
              {item.nextAction && !item.followUpTaskId && (
                <ActionForm
                  action={createInterviewFollowUpAction}
                  submitLabel="Create follow-up task"
                >
                  <input type="hidden" name="id" value={item.id} />
                </ActionForm>
              )}
              {item.followUpTaskId && (
                <p className="text-xs text-emerald-700">Linked follow-up task created.</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section
        id="english"
        className="scroll-mt-32 space-y-3 rounded-2xl border bg-card p-5 lg:scroll-mt-20"
      >
        <h2 className="text-xl font-bold">English communication</h2>
        <p className="text-sm text-muted-foreground">
          Self-rating anchor for each dimension: 1 = frequent difficulty; 3 = understandable with
          noticeable errors; 5 = consistently clear and controlled. A named reviewer is still
          user-entered evidence, not automatic certification.
        </p>
        <details>
          <summary className="cursor-pointer font-semibold text-primary">
            Record English practice
          </summary>
          <ActionForm
            action={addEnglishPracticeAction}
            submitLabel="Record English practice"
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            <label className={label}>
              Date
              <input type="date" name="date" defaultValue={today} required className={field} />
            </label>
            <label className={label}>
              Type
              <select name="type" className={field}>
                <option value="free_speaking">Free speaking</option>
                <option value="technical_explanation">Technical explanation</option>
                <option value="mock_interview">Mock interview</option>
                <option value="conversation">Conversation</option>
                <option value="grammar">Grammar practice</option>
                <option value="pronunciation">Pronunciation</option>
              </select>
            </label>
            <label className={label}>
              Topic
              <input name="topic" required className={field} />
            </label>
            <label className={label}>
              Minutes
              <input type="number" name="durationMinutes" min="1" required className={field} />
            </label>
            {(['fluency', 'grammar', 'clarity', 'pronunciation', 'confidence'] as const).map(
              (key) => (
                <label key={key} className={label}>
                  Self-rated {key} (1–5)
                  <input type="number" name={key} min="1" max="5" className={field} />
                </label>
              ),
            )}
            <label className={label}>
              Reviewer, if external
              <input name="reviewer" className={field} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Reflection
              <input name="reflection" className={field} />
            </label>
          </ActionForm>
        </details>
        <details>
          <summary className="cursor-pointer font-semibold text-primary">
            Record grammar correction
          </summary>
          <ActionForm
            action={addGrammarMistakeAction}
            submitLabel="Add correction"
            className="mt-2 grid gap-2 sm:grid-cols-2"
          >
            <label className={label}>
              Original expression
              <input name="original" required className={field} />
            </label>
            <label className={label}>
              Corrected expression
              <input name="corrected" required className={field} />
            </label>
            <label className={label}>
              Category
              <input name="category" required placeholder="Tense" className={field} />
            </label>
            <label className={label}>
              Note
              <input name="note" className={field} />
            </label>
            <label className={label}>
              Practice (optional)
              <select name="practiceId" className={field}>
                <option value="">None</option>
                {english.slice(0, 30).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.date} · {item.topic}
                  </option>
                ))}
              </select>
            </label>
          </ActionForm>
        </details>
        <p className="text-sm">
          Recent 180 days: {english.length} sessions ·{' '}
          {english.reduce((sum, item) => sum + item.durationMinutes, 0)} recorded minutes.{' '}
          {english.length < 2
            ? 'More assessed sessions are needed for a trend.'
            : 'Compare dated self-ratings below; practice time alone does not establish fluency.'}
        </p>
        <div
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
          aria-label="English rating trends"
        >
          {englishTrends.map((item) => (
            <div key={item.dimension} className="rounded-lg border p-2 text-sm">
              <p className="font-medium capitalize">{item.dimension}</p>
              <p>
                {item.latest == null
                  ? 'Not assessed'
                  : `Latest rated day ${item.latest.toFixed(1)}/5`}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.change == null
                  ? `${item.measuredDays} rated day${item.measuredDays === 1 ? '' : 's'}; no comparison`
                  : `${item.change >= 0 ? '+' : ''}${item.change.toFixed(1)} vs first rated day (${item.measuredDays} rated days)`}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {english.slice(0, 8).map((item) => (
            <article key={item.id} className="rounded-xl border p-3 text-sm">
              <h3 className="font-semibold">
                {item.date} · {item.topic}
              </h3>
              <p>
                {item.durationMinutes} min · {item.type.replaceAll('_', ' ')} ·{' '}
                {item.reviewer ? `Reviewer entered: ${item.reviewer}` : 'SELF-ASSESSED'}
              </p>
              <p>
                Fluency {item.fluency ?? 'Not assessed'}/5 · grammar{' '}
                {item.grammar ?? 'Not assessed'}/5 · clarity {item.clarity ?? 'Not assessed'}/5
              </p>
            </article>
          ))}
        </div>
        <h3 className="font-semibold">Corrections to review</h3>
        <div className="space-y-2">
          {mistakes.slice(0, 10).map((item) => (
            <div key={item.id} className="rounded-xl border p-3 text-sm">
              <p>
                {item.original} → {item.corrected} · {item.category}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.reviewedAt ? 'Reviewed' : 'Needs review'}
              </p>
              {!item.reviewedAt && (
                <ActionForm
                  action={reviewGrammarMistakeAction}
                  submitLabel="Mark correction reviewed"
                >
                  <input type="hidden" name="id" value={item.id} />
                </ActionForm>
              )}
            </div>
          ))}
          {!mistakes.length && (
            <p className="text-sm text-muted-foreground">No corrections logged.</p>
          )}
        </div>
      </section>

      <section
        id="weight"
        className="scroll-mt-32 space-y-3 rounded-2xl border bg-card p-5 lg:scroll-mt-20"
      >
        <h2 className="text-xl font-bold">Recorded body weight</h2>
        <p className="text-sm text-muted-foreground">
          Actual kg measurements only. Same-day readings are averaged once for the daily point;
          weekly averages use available daily points. Missing days are ignored.
        </p>
        <WeightTrend points={trend.daily} target={target} />
        <p className="text-sm">
          Latest measured week:{' '}
          {trend.latest
            ? `${trend.latest.average.toFixed(1)} kg (${trend.latest.limited ? 'Limited data — ' : ''}${trend.latest.measuredDays} measured ${trend.latest.measuredDays === 1 ? 'day' : 'days'})`
            : 'No measurements'}{' '}
          · Previous calendar week:{' '}
          {trend.previous ? `${trend.previous.average.toFixed(1)} kg` : 'No measurements'} ·
          Baseline: {trend.baseline == null ? 'No data' : `${trend.baseline.toFixed(1)} kg`}
          {trend.changeFromBaseline == null
            ? ''
            : ` · Change ${trend.changeFromBaseline >= 0 ? '+' : ''}${trend.changeFromBaseline.toFixed(1)} kg`}
          {target == null ? '' : ` · Target ${target} kg`}
        </p>
        <p className="text-xs text-muted-foreground">
          Coverage is based on measured days in each week; three days is the reference for a fuller
          sample.
        </p>
        <details>
          <summary className="cursor-pointer font-semibold text-primary">
            Record actual weight
          </summary>
          <ActionForm
            action={addWeightAction}
            submitLabel="Record weight"
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            <label className={label}>
              Date
              <input type="date" name="date" defaultValue={today} required className={field} />
            </label>
            <label className={label}>
              Weight (kg)
              <input
                type="number"
                name="value"
                step="0.1"
                min="20"
                max="500"
                required
                className={field}
              />
            </label>
            <label className={label}>
              Note
              <input name="note" className={field} />
            </label>
          </ActionForm>
        </details>
        <details>
          <summary className="cursor-pointer font-semibold text-primary">
            Correct measurements
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {weights.slice(0, 20).map((item) => (
              <ActionForm
                key={item.id}
                action={changeWeightAction}
                submitLabel="Save correction"
                className="rounded-xl border p-3 text-sm space-y-2"
              >
                <input type="hidden" name="id" value={item.id} />
                <label className={label}>
                  Date
                  <input
                    type="date"
                    name="date"
                    defaultValue={item.date}
                    required
                    className={field}
                  />
                </label>
                <label className={label}>
                  Kg
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="500"
                    name="value"
                    defaultValue={item.value}
                    required
                    className={field}
                  />
                </label>
                <label className={label}>
                  Note
                  <input name="note" defaultValue={item.note ?? ''} className={field} />
                </label>
                <label className={label}>
                  Action
                  <select name="operation" defaultValue="edit" className={field}>
                    <option value="edit">Correct entry</option>
                    <option value="delete">Remove erroneous entry</option>
                  </select>
                </label>
                <label className="flex gap-2">
                  <input type="checkbox" name="confirm" /> Confirm removal if selected
                </label>
              </ActionForm>
            ))}
          </div>
        </details>
      </section>

      <section
        id="applications"
        className="scroll-mt-32 space-y-3 rounded-2xl border bg-card p-5 lg:scroll-mt-20"
      >
        <h2 className="text-xl font-bold">Internship applications</h2>
        <p className="text-sm text-muted-foreground">
          Saved opportunities are not submitted applications. Stages reflect only changes you
          record; no emails or applications are sent.
        </p>
        <p className="text-sm">
          {pipeline.submitted} submitted · {pipeline.active} active · {pipeline.assessments}{' '}
          assessments · {pipeline.interviews} interview stages · {pipeline.offers} offers ·{' '}
          {pipeline.rejected} rejected · {pipeline.overdue} overdue follow-ups
        </p>
        <details>
          <summary className="cursor-pointer font-semibold text-primary">Save opportunity</summary>
          <ActionForm
            action={saveApplicationAction}
            submitLabel="Save opportunity"
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            <label className={label}>
              Company
              <input name="company" required className={field} />
            </label>
            <label className={label}>
              Role title
              <input name="roleTitle" required className={field} />
            </label>
            <label className={label}>
              Track
              <select name="roleTrack" className={field}>
                <option>SE</option>
                <option>DevOps</option>
                <option>QA</option>
                <option>Other</option>
              </select>
            </label>
            <label className={label}>
              Application URL
              <input type="url" name="url" className={field} />
            </label>
            <label className={label}>
              Location
              <input name="location" className={field} />
            </label>
            <label className={label}>
              Arrangement
              <select name="arrangement" className={field}>
                <option value="">Unspecified</option>
                <option value="onsite">On site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </label>
            <label className={label}>
              Actual application date, if submitted
              <input type="date" name="appliedOn" className={field} />
            </label>
            <label className={label}>
              Follow-up date
              <input type="date" name="followUpDate" className={field} />
            </label>
            <label className={label}>
              Contact name
              <input name="contactName" className={field} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Private note
              <input name="note" className={field} />
            </label>
          </ActionForm>
        </details>
        <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
          <label>
            Track
            <select name="track" defaultValue={query.track ?? ''} className={field}>
              <option value="">All</option>
              <option>SE</option>
              <option>DevOps</option>
              <option>QA</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Stage
            <select name="stage" defaultValue={query.stage ?? ''} className={field}>
              <option value="">All</option>
              {stages.map(([key, text]) => (
                <option key={key} value={key}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-10 rounded-lg border px-3 text-primary">
            Filter
          </button>
        </form>
        <div className="grid gap-3 md:grid-cols-2">
          {filteredApplications.map((item) => (
            <article key={item.id} className="rounded-xl border p-3 text-sm space-y-2">
              <h3 className="font-semibold">
                {item.company} · {item.roleTitle}
              </h3>
              <p>
                {item.roleTrack} · {item.stage.replaceAll('_', ' ')} ·{' '}
                {item.appliedOn ? `Applied ${item.appliedOn}` : 'Not submitted'}
                {item.followUpDate
                  ? ` · Follow up ${item.followUpDate}${item.followUpDate < today ? ' (overdue)' : ''}`
                  : ''}
              </p>
              <details>
                <summary className="cursor-pointer text-primary">Edit details</summary>
                <ActionForm
                  action={saveApplicationAction}
                  submitLabel="Save application"
                  className="mt-2 grid gap-2 sm:grid-cols-2"
                >
                  <input type="hidden" name="id" value={item.id} />
                  <label className={label}>
                    Company
                    <input name="company" defaultValue={item.company} required className={field} />
                  </label>
                  <label className={label}>
                    Role title
                    <input
                      name="roleTitle"
                      defaultValue={item.roleTitle}
                      required
                      className={field}
                    />
                  </label>
                  <label className={label}>
                    Track
                    <select name="roleTrack" defaultValue={item.roleTrack} className={field}>
                      <option>SE</option>
                      <option>DevOps</option>
                      <option>QA</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className={label}>
                    URL
                    <input type="url" name="url" defaultValue={item.url ?? ''} className={field} />
                  </label>
                  <label className={label}>
                    Location
                    <input name="location" defaultValue={item.location ?? ''} className={field} />
                  </label>
                  <label className={label}>
                    Arrangement
                    <select
                      name="arrangement"
                      defaultValue={item.arrangement ?? ''}
                      className={field}
                    >
                      <option value="">Unspecified</option>
                      <option value="onsite">On site</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Remote</option>
                    </select>
                  </label>
                  <label className={label}>
                    Application date
                    <input
                      type="date"
                      name="appliedOn"
                      defaultValue={item.appliedOn ?? ''}
                      className={field}
                    />
                  </label>
                  <label className={label}>
                    Follow-up date
                    <input
                      type="date"
                      name="followUpDate"
                      defaultValue={item.followUpDate ?? ''}
                      className={field}
                    />
                  </label>
                  <label className={label}>
                    Contact name
                    <input
                      name="contactName"
                      defaultValue={item.contactName ?? ''}
                      className={field}
                    />
                  </label>
                  <label className={label}>
                    Note
                    <input name="note" defaultValue={item.note ?? ''} className={field} />
                  </label>
                </ActionForm>
              </details>
              <ActionForm
                action={changeApplicationStageAction}
                submitLabel="Record stage"
                className="flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="id" value={item.id} />
                <label>
                  Next stage
                  <select name="stage" defaultValue={item.stage} className={field}>
                    {stages.map(([key, text]) => (
                      <option key={key} value={key}>
                        {text}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Actual application date
                  <input
                    type="date"
                    name="appliedOn"
                    defaultValue={item.appliedOn ?? ''}
                    className={field}
                  />
                </label>
              </ActionForm>
              {item.followUpDate && !item.followUpTaskId && (
                <ActionForm
                  action={createApplicationFollowUpAction}
                  submitLabel="Create follow-up task"
                >
                  <input type="hidden" name="id" value={item.id} />
                </ActionForm>
              )}
              {item.followUpTaskId && (
                <p className="text-xs text-emerald-700">Linked ordinary task created.</p>
              )}
              <details>
                <summary className="cursor-pointer text-primary">Stage history</summary>
                <ol className="mt-1 list-inside list-disc text-xs">
                  {history
                    .filter((event) => event.applicationId === item.id)
                    .map((event) => (
                      <li key={event.id}>
                        {localDate(event.changedAt)}: {event.fromStage ?? 'New'} → {event.toStage}
                      </li>
                    ))}
                </ol>
              </details>
            </article>
          ))}
          {!filteredApplications.length && (
            <p className="text-sm text-muted-foreground">No applications match this filter.</p>
          )}
        </div>
      </section>
    </div>
  );
}
