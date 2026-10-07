# HabitFlow

For Vercel and Neon production preparation, environment settings, migrations, and the deployment approval checklist, see [DEPLOYMENT.md](DEPLOYMENT.md).

For the double-click Windows application, see [DESKTOP.md](DESKTOP.md).

HabitFlow is a Next.js 16 habit tracker. This repository currently includes foundation work and pre-existing feature code. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for phases and known gaps.

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

Run `npm run db:migrate` after starting PostgreSQL to create the initial tables. The initial migration includes the Better Auth tables and existing domain tables. Additional domain integrity rules remain future work. `db:push` is available for local experimentation only and must not replace reviewed migrations in deployment.

## Authentication

Visit `/register` to create an account or `/login` to return. Better Auth stores password hashes and persistent sessions in PostgreSQL. The app resolves identity from the server session before reading user-owned data; protected routes redirect to `/login` when the session is absent. The older `/sign-in` and `/sign-up` links redirect to the new pages.

## Development commands

| Command                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Start the development server                      |
| `npm run lint`         | Run ESLint                                        |
| `npm run typecheck`    | Run strict TypeScript checks                      |
| `npm run format:check` | Check formatting                                  |
| `npm run format`       | Format source files                               |
| `npm test`             | Run Vitest unit tests                             |
| `npm run test:e2e`     | Run Playwright tests when e2e cases are added     |
| `npm run build`        | Create a production build                         |
| `npm run db:check`     | Test the PostgreSQL connection using `.env.local` |
| `npm run db:generate`  | Generate a Drizzle migration from the schema      |
| `npm run db:migrate`   | Apply reviewed migrations                         |

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
