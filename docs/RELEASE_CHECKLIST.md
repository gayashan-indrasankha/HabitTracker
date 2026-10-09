# P4 release verification

## Latest verification â€” 2026-10-09

The release verdict is **VERIFIED** for the P4 definition of done. Both required GitHub jobs passed on `c9ecfaf`, including 28/28 browser tests, the separate local-midnight case, and packaged Windows restart persistence. No known BLOCKER or HIGH release defect remains. The earlier 2026-10-08 record remains available in Git history.

### Environment and baseline

- `main` began at clean commit `081c55f`; release fixes are at `c9ecfaf`. Windows 11, Node `v24.13.1`, npm `11.8.0`, PostgreSQL `16.14` in the local HabitFlow Docker container, Playwright `1.63.0` with managed Chromium. The GitHub jobs use Node 24, PostgreSQL 16, Ubuntu and Windows runners.
- P0 effective-dated schedules and historical exceptions, P1 editing and priorities, P2 weekly planning and recovery, and P3 evidence/career views are present. Core routes: Home, Today, Week, Habits, Goals, Evidence, Review, Notes, and Settings; auth, health, and export API routes are present.
- All test databases were created under random names by loopback-only harnesses or in temporary PGlite directories. No production or personal database, cloud migration, or deployment was touched.

### Verification matrix

| Area                                              | Command / evidence                                                                                              | Result                                                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static gates and unit logic                       | `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`              | PASS; 57 unit tests and production route build.                                                                                                           |
| Auth and isolation                                | `npm run test:e2e`                                                                                              | PASS in the final hosted 28/28 run: registration, login, session/logout, invalid credentials, protected routes, and two-user boundaries.                  |
| Habits, Today, Week, Goals, P3, Review, export    | `npm run test:e2e`                                                                                              | PASS in the final hosted 28/28 run, including history, scheduling, priorities, evidence, and private export.                                              |
| Historical month tracker and five viewport widths | `npm run test:e2e -- responsive.spec.ts tracker.spec.ts`                                                        | PASS; 6/6 after correction at 320, 390, 768, 1024, and 1440px.                                                                                            |
| Local-midnight eligibility                        | PowerShell: `$env:HABITFLOW_TEST_NOW='2026-10-08T18:40:00Z'; npm.cmd run test:e2e -- timezone-midnight.spec.ts` | PASS; Colombo local day available while UTC is still yesterday.                                                                                           |
| Visual and keyboard checks                        | Responsive Playwright cases, saved `habit-form-320.png`, `habit-form-390.png`, `habit-form-1440.png`            | PASS; inspected 320px and 1440px forms, readable controls and no page-level horizontal overflow. Navigation keyboard flow and focused active page passed. |

The first local full browser run was 26/28 because the 320px navigation assertion raced the active-tab scroll under concurrent package load and a tracker fixture expected a newly started habit in years before its start date. Hosted run [37902634868](https://github.com/gayashan-indrasankha/HabitTracker/actions/runs/37902634868) reproduced only the tracker fixture failure; its responsive cases passed. The focused 6/6 local rerun verifies both corrections. The final hosted run passed all 28 browser tests and its separate local-midnight test.

For local PostgreSQL and browser tests, `HABITFLOW_TEST_ADMIN_URL` was explicitly set to `postgresql://habitflow:habitflow@127.0.0.1:5433/habitflow` from `docker-compose.yml`. The harness created and dropped only its own random test databases; it did not alter the admin database's existing tables.

### Database and desktop

| Check                                    | Command                                                                                                   | Result                                                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh PGlite and close/reopen            | `node scripts/check-embedded-migrations.mjs`; `node tests/integration/pglite-persistence.mjs`             | PASS.                                                                                                                                                                   |
| Historical PGlite upgrade                | `node tests/integration/release-upgrade.mjs pglite`                                                       | PASS; seven genuine boundaries `0002`, `0006`, `0007`, `0008`, `0010`, `0012`, `0013` upgraded through `0014`, with retained IDs, links, dates, and constraints.        |
| Fresh PostgreSQL and historical upgrades | `node tests/integration/release-upgrade.mjs postgres`                                                     | PASS on disposable local databases at the same seven boundaries.                                                                                                        |
| P0â€“P3 PostgreSQL behavior              | `node tests/integration/scheduling-postgres.mjs`, `p1-postgres.mjs`, `p2-postgres.mjs`, `p3-postgres.mjs` | PASS; scheduling and owner constraints, priority transactions, rest day separation, evidence links.                                                                     |
| Desktop standalone server                | `npm run desktop:smoke`                                                                                   | PASS; fresh PGlite, health, registration, authenticated main routes, export.                                                                                            |
| Windows package                          | `npm run desktop:package`                                                                                 | PASS; `HabitFlow 0.1.0.exe` was 521,747,828 bytes. Staged migration journal and standalone server were present.                                                         |
| Packaged Electron UI and restart         | `node tests/desktop/portable.mjs`                                                                         | PASS on `win-unpacked/HabitFlow.exe`; registration, habit completion, export, core routes, clean shutdown, and persistence in the same isolated profile after relaunch. |
| Prior packaged-version data upgrade      | No earlier portable artifact available                                                                    | NOT RUN. Historical schema upgrades are covered by the two database engines above.                                                                                      |

The earlier attempt to run a desktop build while the smoke server was using `.next/standalone` invalidated that one local smoke run. Both commands passed when rerun in sequence; CI keeps these steps sequential.

### CI and findings

| Workflow on `c9ecfaf`   | Hosted run                                                                                   | Result                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Quality gate            | [37904194664](https://github.com/gayashan-indrasankha/HabitTracker/actions/runs/37904194664) | PASS; 57 unit, 28 browser, 1 midnight, migrations, integrations, and build. |
| Windows desktop package | [37904194634](https://github.com/gayashan-indrasankha/HabitTracker/actions/runs/37904194634) | PASS                                                                        |

- **HIGH, fixed:** CI production builds lacked the test-only server environment values required during Next.js route collection.
- **MEDIUM, fixed:** The release upgrade fixture expected 14 migrations after migration `0014` made 15. The added `0013` boundary verifies upgrade of the immediately preceding schema.
- **LOW, fixed:** The packaged UI test assumed a desktop sidebar on a narrow hosted Windows screen. It now verifies the visible navigation.
- **LOW, fixed:** The tracker test's historical-month expectation contradicted its habit start date. It now uses a genuine historical habit and confirms the newer habit is absent before its start.
- The packaged application ran with Node integration disabled, context isolation and renderer sandbox enabled, loopback binding, and encrypted session-secret storage. The unsigned portable wrapper was built but not published or signed.
