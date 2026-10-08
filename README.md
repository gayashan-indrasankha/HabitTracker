# HabitFlow

For Vercel and Neon production preparation, environment settings, migrations, and the deployment approval checklist, see [DEPLOYMENT.md](DEPLOYMENT.md).

For the double-click Windows application, see [DESKTOP.md](DESKTOP.md).

HabitFlow is a Next.js 16 personal planning app built on the existing habit tracker. Today connects three selected tasks, time blocks, applicable habits, and a private daily note. Week, Goals, and Review provide a lightweight planning loop. The original monthly tracker remains at `/dashboard?month=YYYY-MM`.

## Requirements

- Node.js 20.9 or newer and npm
- Docker Desktop with Docker Compose, or a PostgreSQL 16 server

For local development without Docker, the project can run its embedded PGlite database instead.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and replace `BETTER_AUTH_SECRET` with a unique random value of at least 32 characters. Keep `.env.local` out of source control.
3. Start PostgreSQL: `docker compose up -d postgres`. The container uses host port 5433 by default to avoid clashes with an existing local PostgreSQL server. Set `HABITFLOW_DB_PORT` if you need another port, and match `DATABASE_URL`.
   If you already have a `.env.local` pointing at port 5432, update its `DATABASE_URL` to 5433 for this container.
4. Check connectivity: `npm run db:check`
5. Start Next.js: `npm run dev` and open <http://localhost:3000>.

If Docker Desktop is unavailable, run `npm.cmd run db:embedded` in one terminal instead of step 3. Keep it running while you use the app. Run `npm.cmd run db:check` to confirm the connection, then run `npm.cmd run dev` in another terminal. The embedded command applies the checked-in migrations automatically and keeps local data in the ignored `.local-embedded-db/` directory. Do not run `db:migrate` separately for this mode. The embedded database is separate from Docker and the desktop app.

Run `npm run db:migrate` on the intended **local** database after starting PostgreSQL. Migrations `0003`–`0006` add Life OS tables, ownership constraints, daily priority uniqueness, nullable template keys, and subject assessments without removing existing rows. Review the target and back up its data before applying migrations. `db:push` is for local experimentation only.

## Authentication

Visit `/register` to create an account or `/login` to return. Successful authentication opens `/today`. Better Auth stores password hashes and persistent sessions in PostgreSQL. The app resolves identity from the server session before reading user-owned data; protected routes redirect to `/login` when the session is absent. The older `/sign-in` and `/sign-up` links redirect to the new pages.

## Daily workflow

- `/today`: choose up to three tasks, change day mode, run or reschedule time blocks, record habits, and write an evening note.
- `/week`: inspect Monday–Sunday blocks, add recurring or one-off blocks, edit times, and override a single occurrence. Fixed commitments resist casual skipping and moving.
- `/goals`: create goals, projects, tasks, and five university subject slots. Grades are entered outcomes, not inferred from habit checks.
- `/goals/evidence`: record topic practice, milestone reviews, interview and English assessments, actual body weight, and internship applications. See [EVIDENCE.md](EVIDENCE.md).
- `/review`: compare fixed-habit adherence, finished tasks, completed blocks, and actual measurements; save a private weekly reflection.
- `/dashboard`: the historical month tracker. Flexible `weekly:N` habits display complete-week quota attainment and monthly raw checks, outside fixed-day percentages. See [SCHEDULING.md](SCHEDULING.md).
- `/settings/life-os`: preview and selectively apply an optional personal template. Applying it again preserves records with the same template keys. Nothing is seeded at registration.
- `/settings`: set timezone, week start, and theme; download an explicit versioned JSON backup. The backup includes private notes and reviews and excludes auth credentials. There is no import/restore flow.

The web PostgreSQL and desktop PGlite databases remain separate. No automatic synchronization is provided.

## Development commands

| Command                                      | Purpose                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`                                | Start the development server                                                    |
| `npm run lint`                               | Run ESLint                                                                      |
| `npm run typecheck`                          | Run strict TypeScript checks                                                    |
| `npm run format:check`                       | Check formatting                                                                |
| `npm run format`                             | Format source files                                                             |
| `npm test`                                   | Run Vitest unit tests                                                           |
| `npm run test:e2e`                           | Run Playwright flows against an isolated test database with a browser installed |
| `npm run build`                              | Create a production build                                                       |
| `npm run db:check`                           | Test the PostgreSQL connection using `.env.local`                               |
| `npm run db:generate`                        | Generate a Drizzle migration from the schema                                    |
| `npm run db:migrate`                         | Apply reviewed migrations                                                       |
| `node scripts/check-embedded-migrations.mjs` | Check migrations and owner constraints in fresh PGlite                          |
| `npm run desktop:smoke`                      | Smoke test the built standalone server with a fresh embedded database           |

Scheduling regression checks use a disposable database on a local PostgreSQL server. Set `HABITFLOW_TEST_ADMIN_URL` to a loopback admin database URL, then run `node tests/integration/scheduling-postgres.mjs` for fresh and upgrade migrations or `node tests/e2e/run-scheduling.mjs` for the focused browser flow. Each runner creates a randomly named database and drops only that database afterward. The browser runner uses port 3100 and a separate `.next-e2e` output directory. For a desktop server smoke using that build, set `HABITFLOW_SMOKE_BUILD_DIR=.next-e2e` before `npm run desktop:smoke`.

On Windows PowerShell systems that block `npm.ps1`, use `npm.cmd` in place of `npm`.

## Structure

- `app/`: App Router pages and layouts
- `components/ui/`: shared shadcn-style UI primitives
- `components/`: feature and layout components
- `lib/env.ts`: server environment validation
- `lib/db/`: Drizzle schema and connection
- `lib/{dal,actions,analytics,validations}/`: existing feature boundaries
- `tests/`: unit, integration, and end-to-end test locations
- `scripts/`: local development checks

The application uses Tailwind CSS 4, shadcn component conventions, Drizzle ORM, PostgreSQL, and Zod. No credentials are stored in tracked files.

## Editing workflows (P1)

On Goals & Projects, open **Edit goal** or **Edit project** to change saved fields. Empty optional fields clear their values. Archive hides an item from the active list and retains its linked tasks, milestones, and history; the collapsed archived list provides Restore.

On Today, **Add to Today** searches the full available task backlog and filters by life area or project. Choose an empty priority slot to assign, or explicitly confirm replacement of an occupied slot. Move, swap, and remove controls keep three ordered task references. Removing a priority leaves the task and its associations intact. Completed priorities remain visible. Changing Normal, Reduced, or Minimum mode does not alter the saved ranks.

On Week, the weekday checkboxes encode the Monday-first recurrence mask. Series edits take effect on the chosen date and preserve prior recorded occurrences. One-occurrence changes use **Change occurrence**. Fixed commitment changes require confirmation. See [SCHEDULING.md](SCHEDULING.md) for the calendar rules.

Migration `0008` adds goal/project archive timestamps and revisioned block end dates, fixed flags, and task/goal/project links. Apply it only to the intended local database. Run `node tests/integration/p1-pglite.mjs` for an isolated embedded upgrade check. For PostgreSQL and browser verification, set `HABITFLOW_TEST_ADMIN_URL` to a loopback PostgreSQL admin URL and run `node tests/integration/scheduling-postgres.mjs`, `node tests/integration/p1-postgres.mjs`, and `node tests/e2e/run-scheduling.mjs tests/e2e/scheduling.spec.ts tests/e2e/p1-editing.spec.ts`. The E2E runner creates and drops its own random database and uses port 3100.

## Flexible weekly planning (P2)

On Week, the workload card separates fixed commitments from flexible planned time, shows daily and life-area totals, completed sessions, and actual minutes only where recorded. Set an optional daily flexible capacity to highlight overloaded days. Open **Adjust** on a flexible session to move it, change its time, shorten it, skip it, or restore its original slot. These actions retain the original occurrence identity and check collisions on Save.

The optional fifth gym visit has a configurable day, time, and activity type. Disable it to plan rest without recording a failed workout. The original four template workouts and their completion records are retained. **Plan time off** previews fixed and flexible commitments for a chosen date; you explicitly choose flexible sessions to excuse. Fixed commitments and habits remain unchanged. You can edit or cancel a time-off plan, and excused sessions remain visible in history.

On Today, Reduced and Minimum show fewer priorities and flexible sessions. **Show full plan** reveals de-emphasized work without changing its stored state. Minimum mode lets you record a smaller action separately from full habit completion. **Resume normal plan** restores the full view and saved priority ranks.

Additive migrations `0009` and `0010` store planning capacity, one-off time-off records and linked excusals, and minimum actions. The JSON backup includes these records and revision history. For isolated checks, run `node tests/integration/p1-pglite.mjs` and, with `HABITFLOW_TEST_ADMIN_URL` set to a loopback admin URL, `node tests/e2e/run-scheduling.mjs tests/e2e/p2-planning.spec.ts`. No production migration or deployment is automatic.

## Evidence and career tracking (P3)

Goals & Projects links to one nested Evidence view for university topic practice, project milestone criteria and reviews, interview sessions, English sessions and grammar corrections, actual body-weight measurements, and internship applications. Weekly Review distinguishes recorded practice from grades, completed tasks from quality acceptance, and actual measurements from targets. Today shows a small number of due follow-ups. Evidence rules, formulas, assessment labels, and missing-data behavior are documented in [EVIDENCE.md](EVIDENCE.md).

Additive migrations `0011`–`0013` store P3 records, append-only milestone review history, and optional scored interview results. The explicit JSON backup includes these private records. Apply migrations only to the intended local database after backup. Run `node tests/integration/p3-pglite.mjs` for a fresh embedded check, `node tests/integration/p1-pglite.mjs` for an embedded upgrade check, and, with `HABITFLOW_TEST_ADMIN_URL` set to a loopback PostgreSQL admin URL, `node tests/integration/p3-postgres.mjs` and `node tests/e2e/run-scheduling.mjs tests/e2e/p3-evidence.spec.ts`. The tests use disposable databases. No production migration or deployment is part of P3.
