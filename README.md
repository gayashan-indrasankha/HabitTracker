# HabitFlow

For Vercel and Neon production preparation, environment settings, migrations, and the deployment approval checklist, see [DEPLOYMENT.md](DEPLOYMENT.md).

For the double-click Windows application, see [DESKTOP.md](DESKTOP.md).

HabitFlow is a Next.js 16 personal planning app built on the existing habit tracker. Today connects three selected tasks, time blocks, applicable habits, and a private daily note. Week, Goals, and Review provide a lightweight planning loop. The original monthly tracker remains at `/dashboard?month=YYYY-MM`.

## Requirements

- Node.js 20.9 or newer and npm
- Docker Desktop with Docker Compose, or a PostgreSQL 16 server

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and replace `BETTER_AUTH_SECRET` with a unique random value of at least 32 characters. Keep `.env.local` out of source control.
3. Start PostgreSQL: `docker compose up -d postgres`. The container uses host port 5433 by default to avoid clashes with an existing local PostgreSQL server. Set `HABITFLOW_DB_PORT` if you need another port, and match `DATABASE_URL`.
   If you already have a `.env.local` pointing at port 5432, update its `DATABASE_URL` to 5433 for this container.
4. Check connectivity: `npm run db:check`
5. Start Next.js: `npm run dev` and open <http://localhost:3000>.

Run `npm run db:migrate` on the intended **local** database after starting PostgreSQL. Migrations `0003`–`0006` add Life OS tables, ownership constraints, daily priority uniqueness, nullable template keys, and subject assessments without removing existing rows. Review the target and back up its data before applying migrations. `db:push` is for local experimentation only.

## Authentication

Visit `/register` to create an account or `/login` to return. Successful authentication opens `/today`. Better Auth stores password hashes and persistent sessions in PostgreSQL. The app resolves identity from the server session before reading user-owned data; protected routes redirect to `/login` when the session is absent. The older `/sign-in` and `/sign-up` links redirect to the new pages.

## Daily workflow

- `/today`: choose up to three tasks, change day mode, run or reschedule time blocks, record habits, and write an evening note.
- `/week`: inspect Monday–Sunday blocks, add recurring or one-off blocks, edit times, and override a single occurrence. Fixed commitments resist casual skipping and moving.
- `/goals`: create goals, projects, tasks, and five university subject slots. Grades are entered outcomes, not inferred from habit checks.
- `/review`: compare fixed-habit adherence, finished tasks, completed blocks, and actual measurements; save a private weekly reflection.
- `/dashboard`: the historical month tracker. Flexible `weekly:N` habits display complete-week quota attainment and monthly raw checks, outside fixed-day percentages. See [SCHEDULING.md](SCHEDULING.md).
- `/settings/life-os`: preview and selectively apply an optional personal template. Applying it again preserves records with the same template keys. Nothing is seeded at registration.
- `/settings`: set timezone, week start, and theme; download an explicit versioned JSON backup. The backup includes private notes and reviews and excludes auth credentials. There is no import/restore flow.

The web PostgreSQL and desktop PGlite databases remain separate. No automatic synchronization is provided.

## Development commands

| Command                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Start the development server                      |
| `npm run lint`         | Run ESLint                                        |
| `npm run typecheck`    | Run strict TypeScript checks                      |
| `npm run format:check` | Check formatting                                  |
| `npm run format`       | Format source files                               |
| `npm test`             | Run Vitest unit tests                             |
| `npm run test:e2e`     | Run Playwright flows against an isolated test database with a browser installed |
| `npm run build`        | Create a production build                         |
| `npm run db:check`     | Test the PostgreSQL connection using `.env.local` |
| `npm run db:generate`  | Generate a Drizzle migration from the schema      |
| `npm run db:migrate`   | Apply reviewed migrations                         |
| `node scripts/check-embedded-migrations.mjs` | Check migrations and owner constraints in fresh PGlite |
| `npm run desktop:smoke` | Smoke test the built standalone server with a fresh embedded database |

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
