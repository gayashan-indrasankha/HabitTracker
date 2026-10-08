# P4 release verification — 2026-10-08

## Environment and scope

- Baseline: `main` at `72af242`, clean before P4 edits. P0 effective-dated scheduling, P1 editing and priority management, P2 flexible planning and recovery, and P3 evidence/career flows were present in the working tree.
- Windows, Node `v24.13.1`, npm `11.8.0`, Docker Engine `29.5.3`, local PostgreSQL 16 container on port 5433, Playwright-managed Chromium. The browser runner fixes application time at `2026-10-08T12:30:00Z` and creates a disposable database per run.
- Baseline `npm ci`, typecheck, lint, 45 unit tests, and production build passed. Baseline `npm run format:check` failed on existing source formatting and Drizzle snapshots. The first browser attempt lacked a managed Chromium install; the subsequent 13-test run passed 12 and exposed one test assertion against a correctly disabled Current month button. That assertion was corrected.
- No production infrastructure, credentials, user database, or deployment was used.

## Verification matrix

| Area                                   | Test type and command                                                                    | Result | Evidence / remaining issue                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Authentication and two-user isolation  | Browser, `npm run test:e2e`                                                              | PASS   | Registration, login, logout, protected routes, invalid credentials, and separate accounts. |
| Habits and monthly tracker             | Browser, `npm run test:e2e`                                                              | PASS   | Create/edit/archive/reorder, toggle persistence, calendar boundaries, mobile grid.         |
| Today priorities and day modes         | Browser, `npm run test:e2e`                                                              | PASS   | P1/P2 browser workflows.                                                                   |
| Scheduling/history and weekly planning | Unit, PostgreSQL integration, browser                                                    | PASS   | P0/P1/P2 suites and historical occurrence checks.                                          |
| Goals, projects, P3 progress           | Browser, `npm run test:e2e`                                                              | PASS   | P1 and P3 suites, owner boundaries.                                                        |
| Weekly review and export               | Browser, `npm run test:e2e`                                                              | PASS   | Draft/completion/history, measured outcome, JSON schema and privacy.                       |
| Responsive widths/accessibility        | Browser, `npm run test:e2e`                                                              | PASS   | 320/390/768/1024/1440px routes, page overflow, keyboard navigation, screenshots inspected. |
| Static and unit gates                  | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` | PASS   | Typecheck, lint, formatting, 45 unit tests, production build.                              |

## Database migrations

| Target                   | Command                                               | Result | Evidence                                                                                                                          |
| ------------------------ | ----------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Fresh PGlite             | `node scripts/check-embedded-migrations.mjs`          | PASS   | Fresh tables and owner/unique constraints.                                                                                        |
| Existing-data PGlite     | `node tests/integration/release-upgrade.mjs pglite`   | PASS   | Six genuine boundaries: 0002, 0006, 0007, 0008, 0010, 0012; stable IDs, links, dates, archives, owner and uniqueness constraints. |
| Fresh PostgreSQL         | `node tests/integration/release-upgrade.mjs postgres` | PASS   | Each boundary uses a new disposable database and applies the full chain.                                                          |
| Existing-data PostgreSQL | `node tests/integration/release-upgrade.mjs postgres` | PASS   | Six historical upgrades, migration reapplication, and data/constraint assertions.                                                 |

The upgrade harness checks journal numbering, SQL and snapshot presence, and destructive SQL, then creates only random test databases under a loopback-only admin URL. It drops only databases it created. It does not rewrite checked-in migrations.

## Windows desktop

| Check                                                    | Command                                        | Result  | Remaining issue                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Embedded standalone server, authenticated routes, export | `npm run desktop:smoke`                        | PASS    | Includes P3 evidence route and authenticated write.                                                                         |
| Portable package and bundle inspection                   | `npm run desktop:package`                      | PASS    | 521 MB executable; app identity/version, migration journal, runtime, no `.env` files.                                       |
| Real packaged window and UI                              | `node tests/desktop/portable.mjs`              | PASS    | Packaged `win-unpacked/HabitFlow.exe`; registration, habit completion, core routes.                                         |
| Persistence after packaged restart                       | `node tests/desktop/portable.mjs`              | PASS    | Same isolated PGlite profile; habit and completion survive clean close/relaunch.                                            |
| NSIS portable wrapper startup                            | `HabitFlow 0.1.0.exe`                          | PASS    | Direct launch spawned its extracted Electron child, responsive login window, isolated PGlite profile, and clean child exit. |
| Prior-version packaged upgrade                           | Earlier binary against isolated test directory | NOT RUN | Prior portable binary not available locally. Historical migrations are covered above.                                       |

Web PostgreSQL and desktop PGlite remain separate. The desktop CI job runs the packaged `win-unpacked` executable UI and restart test. Its outcome must be observed on GitHub before counting it as CI evidence.

## CI

`.github/workflows/ci.yml` runs source gates, PostgreSQL/PGlite migrations and browser tests with a PostgreSQL 16 service. `.github/workflows/desktop-check.yml` builds, inspects, and exercises the packaged Windows application. Both use read-only repository permissions, disposable test data, and no production secrets or deployment steps.

| Workflow                | GitHub run                                                                                   | Result  | Evidence / next step                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality gate            | [37817434858](https://github.com/gayashan-indrasankha/HabitTracker/actions/runs/37817434858) | BLOCKED | GitHub refused the job before any step: “The job was not started because your account is locked due to a billing issue.” No runner or logs were created. |
| Windows desktop package | [37817434856](https://github.com/gayashan-indrasankha/HabitTracker/actions/runs/37817434856) | BLOCKED | Same GitHub billing lock; no runner or steps executed.                                                                                                   |

Once the account lock is resolved, rerun both workflows on the current commit and record their actual results. Local execution does not establish a GitHub CI pass.

## Findings and release gate

- **LOW, fixed:** a pre-existing tracker test assumed the Current month button was clickable while already on the fixed current month.
- **HIGH, fixed:** multiple PostgreSQL protocol clients on one PGlite socket could mismatch prepared-statement parameters and return HTTP 500 during desktop UI writes. The client is now shared and uses unnamed statements; real packaged UI and standalone browser regression tests pass.
- **MEDIUM, fixed:** repository formatting was not clean. Applied migration snapshots are excluded from Prettier to preserve metadata; maintained source now passes the formatting gate.
- Local browser suite passed 22/22 twice; the second run followed the desktop database correction. The 45 unit tests, static gates, and production build passed.
- Release verdict is **PARTIALLY VERIFIED** because both required GitHub jobs are BLOCKED by the account billing lock. Playwright's full UI and restart flow used the packaged `win-unpacked` executable; the NSIS wrapper itself was directly launched and closed, but its full data persistence flow was not repeated. The prior-version binary upgrade is NOT RUN because no earlier binary is available.

Run browser and PostgreSQL tests only with `HABITFLOW_TEST_ADMIN_URL` set to a local disposable PostgreSQL admin database. The harness refuses non-loopback hosts. On Windows PowerShell, use `npm.cmd` in place of `npm` if script execution policy blocks npm.ps1.
