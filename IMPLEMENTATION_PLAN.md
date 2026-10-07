# HabitFlow implementation plan

## Current state (audit, 2026-10-05)

The repository already contains a Next.js 16 App Router skeleton, Drizzle schema and data access functions, Better Auth setup, server actions, habit/entry/note/settings forms, dashboard grid, and analytics components. The domain code is a useful starting point, but the product is not yet runnable or production ready.

The baseline `node node_modules/typescript/bin/tsc --noEmit` fails. `components/ui` primitives are absent; `drizzle-kit`, Vitest, the Vite React plugin, and Playwright are referenced but not installed; Recharts tooltip types and Zod 4 error access also fail. There are no unit or end-to-end tests, no migration files, and no deployment instructions. The default README and starter global CSS remain. Existing worktree changes are uncommitted and must be preserved.

Other verified gaps: habit reordering has a server action but no visible control and performs independent updates; best streak only examines a 90-day window; the notes page supports today's note but has no monthly note model; date strings are mixed with host-local `Date` and `toISOString()` conversions; entry mutation checks ownership but not archived status, schedule, start date, or future dates; `updateHabit` converts omitted optional fields to `null`; the browser's form validation is not wired to submission; the dashboard's Suspense boundaries wrap already resolved work; data load and action failures have little user-facing handling. The schema has a unique `(habit_id, date)` entry constraint, but no cross-table constraint ensuring an entry's `user_id` matches its habit owner. These findings are planning inputs, not changes already made.

## 1. Architecture

Keep one Next.js application. Server Components read authenticated, user-scoped data through the DAL; server actions validate and mutate; small Client Components handle forms, grid toggles, theme, and charts. Pure `lib/analytics` functions calculate derived values from habits and entries. PostgreSQL is the source of truth. Do not store derived analytics or add global client state.

## 2. Directory structure

Preserve `app/(auth)`, `app/(app)`, `app/api/auth`, `components/{analytics,auth,dashboard,habits,layout,notes,settings,shared}`, `lib/{actions,analytics,auth,dal,db,utils,validations}`, and `types`. Add `components/ui` for the shadcn primitives already imported, `drizzle/` for versioned SQL migrations, `tests/unit`, `tests/integration`, and `tests/e2e` as the corresponding phases need them. Keep each action and query near its domain.

## 3. Database schema

Retain Better Auth's user/session/account/verification tables. Retain `habits`, `habit_entries`, `daily_notes`, and `user_settings` with user foreign keys and indexed user/date access. Make the existing unique `(habit_id, date)` completion key explicit in migrations; `(user_id, habit_id, date)` may be used if paired with a composite owner relationship. Add SQL checks for target `1..31`, week start `0..6`, and valid settings where practical. Protect entry ownership at the database level with a unique `(habits.user_id, habits.id)` key and composite foreign key from entries, or an equivalent constraint. Use date-only columns for habit calendar dates and UTC timestamps for audit fields. Decide whether monthly notes need a separate entity or a note type plus month key before adding them; preserve existing daily notes.

## 4. Authentication architecture

Keep Better Auth email/password and its Drizzle adapter. Derive the current user ID from the server session for every read and write. Protect pages in the authenticated layout and check each server action independently; middleware can improve navigation but is not the authorization boundary. Configure origins, secret, cookie/security settings, and production URL by environment. Review email verification and password recovery before public launch.

## 5. Application routes

`/` redirects to the appropriate entry point; `/sign-in` and `/sign-up` handle accounts; `/dashboard?month=YYYY-MM` displays the selected month; `/habits`, `/habits/new`, and `/habits/[id]/edit` manage habits; `/notes` manages daily and monthly notes; `/settings` manages timezone, week start, and theme. Better Auth owns `/api/auth/[...all]`. Add route-local `loading.tsx` and `error.tsx` where real asynchronous or recoverable failure states exist.

## 6. Component architecture

Keep page-level data fetching in Server Components. `HabitGrid` and `HabitRow` render one horizontal month; `DayCell` is the small optimistic interaction boundary. Habit and settings forms use shared shadcn controls. Analytics cards wrap Recharts with accessible text totals. Add reorder controls, monthly note editor, and mobile navigation where the current UI lacks them. Ensure grid headers, row labels, button state, focus order, and chart summaries are understandable to assistive technology.

## 7. Analytics calculation strategy

Create one schedule/date eligibility helper used by the grid and every statistic. A completion counts only for a scheduled date on or after the habit start and on or before the user's local today. Define monthly target progress separately from scheduled opportunity completion; show both with clear labels. Calculate daily and weekly series from one month query, and top habits from valid completions and eligible days. Compute best streak from full relevant history or an accurate aggregate query, not a fixed 90-day sample. Define whether streaks mean any daily completion or all scheduled habits; use the chosen rule consistently. Use calendar date strings for comparisons to avoid host timezone drift.

## 8. State management strategy

Server-rendered query results are canonical. URL search parameters own the selected month. React Hook Form owns form field state. `useOptimistic` handles an entry toggle, with rollback and a visible message on failure; server actions revalidate affected routes. Use local state only for transient menus, filters, and pending states. Avoid a global store.

## 9. Validation strategy

Use Zod schemas at server action boundaries and React Hook Form with the same schemas for immediate feedback. Validate real calendar dates and month strings, IANA timezone names, custom schedule masks, target ranges, and text limits. Check business rules after parsing: ownership, archive state, schedule eligibility, start date, and future date policy. Keep database constraints as a final guard. Do not accept user IDs from form fields.

## 10. Testing strategy

Install the missing test packages and add meaningful Vitest tests for date boundaries, schedule eligibility, percentages, weekly grouping, monthly targets, streaks, and malformed input. Add PostgreSQL integration tests for owner isolation, uniqueness, reordering transaction behavior, and note upserts. Add Playwright flows for sign-up/sign-in, create/edit/archive/reorder, grid toggle, month navigation, notes, settings, keyboard use, and a second user's data isolation. Run typecheck, lint, test, build, and end-to-end checks in CI. Avoid snapshot-only tests.

## 11. Responsive design strategy

At desktop width, show the wide tracker and a right analytics rail. On tablets, stack analytics below the grid. On mobile, preserve the horizontal day scroll with a sticky habit-name column, usable touch targets, and clear scroll affordance. Use CSS tokens for light/dark themes and test representative desktop, tablet, and phone widths. Keep charts responsive and give their values accessible text equivalents.

## 12. Security considerations

Scope every DAL query and mutation to the authenticated user. Add database owner consistency for entries, parameterized Drizzle queries, strict server validation, rate limits for account endpoints where the host requires them, safe production secrets, and no secret values in client bundles. Reject invalid dates and unauthorized updates without leaking another user's record existence. Review session settings, origin configuration, and production logging. Test two-user isolation through the UI and DAL.

## 13. Deployment architecture

Use the Next.js Node runtime plus managed PostgreSQL in production. Docker Compose remains for local PostgreSQL. Generate and apply reviewed Drizzle migrations as a distinct deployment step, then deploy the app with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and the public app URL configured. Add a health/readiness check, backups, migration rollback procedure, and CI gates. Document exact local setup and production environment variables in README without committing secrets.

## 14. Bounded implementation phases

1. **Build foundation:** install declared UI and dev dependencies; add shadcn primitives and design tokens; fix TypeScript/Zod/Recharts errors; establish working scripts and baseline build. Exit: typecheck, lint, and build pass.
2. **Data integrity and auth:** generate migrations, add constraints, fix partial update/reorder transaction semantics, harden owner checks and production auth config. Exit: migration and two-user isolation tests pass.
3. **Calendar correctness and analytics:** unify date eligibility/timezone logic, clarify target and streak definitions, remove 90-day best-streak cap. Exit: boundary and analytics tests pass.
4. **Product completion:** finish reorder UI, monthly notes, form submission validation, errors/loading/empty states, and polished responsive tracker/analytics. Exit: desktop, tablet, mobile, and keyboard flows pass.
5. **Release readiness:** add end-to-end coverage, CI, environment/setup/deployment docs, accessibility review, and final visual QA. Exit: full pipeline passes against local PostgreSQL and documented production configuration.

### Architectural decisions and trade-offs

- **Server actions over a custom CRUD API:** fewer duplicate contracts for this first-party app; add API routes only for a real external consumer.
- **Derived analytics over stored counters:** avoids synchronization bugs; a broader history query is needed for accurate best streak.
- **User-local calendar dates over timestamps for completions:** preserves the day the user intended across timezone changes; audit timestamps remain UTC.
- **Per-date entry uniqueness plus owner consistency:** prevents duplicates and cross-user mismatches at the database layer, while actions still authorize every request.
- **Horizontal mobile tracker:** preserves the spreadsheet model; requires sticky labels and explicit accessibility work.

## Approved Phase 1 scope (2026-10-05)

The user approved Phase 1 only. Establish a runnable foundation while preserving existing feature files. The work includes package scripts and dependencies, TypeScript and lint/format configuration, Tailwind/shadcn tokens and the already-imported UI primitives, validated environment configuration, local PostgreSQL and Drizzle connection tooling, base layout, README, and test harness. Existing auth, habit, dashboard, analytics, and tracker behavior stays outside this phase. Compatibility fixes required to make the existing tree compile are allowed; record them separately. Schema migrations and data integrity changes begin in Phase 2.

### Phase 1 task list

- [x] Confirm repository state, configuration, dependency gaps, and available local Docker/PostgreSQL tools.
- [x] Add minimal scripts and dependencies for typecheck, lint, format, tests, Drizzle tooling, and the imported shadcn primitives.
- [x] Add typed server environment validation and use it in database/Drizzle setup without exposing secrets.
- [x] Complete Tailwind theme tokens, shadcn configuration, and base layout styling.
- [x] Add a small meaningful foundation test and test setup.
- [x] Document local setup, database check, and verification commands in README; maintain `.env.example` and ignore local secrets.
- [x] Install dependencies; run PostgreSQL and connectivity check. Port 5432 was occupied, so local Compose now defaults to 5433.
- [x] Run lint, typecheck, tests, and production build; fix Phase 1 and pre-existing compile blockers without implementing features.

Phase 1 note: the repository-wide Prettier check still reports formatting differences in the pre-existing feature files. This phase formatted its new foundation files and preserved those feature files. The existing `.env.local` still targets port 5432, so a developer using this Compose service should update that local URL to port 5433 as described in README.

Stop after Phase 1 and report remaining Phase 2 work.

## Approved Phase 2 scope (2026-10-05)

The user requested authentication and user isolation only. Preserve existing feature code without expanding habit, entry, note, tracker, or analytics behavior. Implement Better Auth registration, login, logout, persistent database sessions, `/login` and `/register`, protected app routes, a reusable server-side user helper, and browser verification. Generate and apply the initial schema migration because authentication needs tables; defer domain behavior and schema hardening beyond the initial migration.

### Phase 2 task list

- [x] Inspect auth config, routes, forms, schema, and local database state.
- [x] Generate/review/apply the initial Drizzle migration on local PostgreSQL.
- [x] Centralize server session/user resolution and use it for protected pages and existing actions.
- [x] Harden Better Auth configuration and protected/auth-page redirects.
- [x] Build accessible `/login` and `/register` forms with shared Zod schemas and responsive pages.
- [x] Verify registration, login, session persistence, logout, protected routes, and separate user sessions with automated browser tests.
- [x] Run typecheck, lint, tests, and production build; document outcomes.

Phase 2 stops at authentication and user isolation as requested. The initial migration reflects the existing schema; additional habit/entry database constraints, business rules, and feature behavior remain outside this phase.

## Approved Phase 3 scope (2026-10-05)

Implement habit management only: create, list, edit, archive, restore, delete with confirmation, and reorder. Keep all operations scoped to the session user. Share one schedule-aware validation contract between React Hook Form and server actions. Use list-level optimistic updates with rollback for archive/restore/reorder. Add authorization and data isolation tests. Preserve the existing monthly dashboard/tracker without extending it.

This phase was superseded by the user's Phase 4 request before production Phase 3 implementation began. Its task list remains pending.

### Phase 3 task list

- [ ] Review existing habit schema, DAL, actions, UI, and relevant Next.js 16 docs.
- [ ] Add schedule-aware validation, tighten name length, and migrate the schema if necessary.
- [ ] Make create/edit/archive/restore/delete/reorder user-scoped, including exact-set transactional reorder.
- [ ] Build HabitForm, HabitDialog, HabitList, HabitRow, and DeleteConfirmationDialog with empty and error states.
- [ ] Test validation, authorization, data isolation, and the lifecycle in a browser.
- [ ] Run migration, typecheck, lint, tests, production build, and browser verification.

## Approved Phase 4 scope (2026-10-05)

Implement the monthly tracker grid, month navigation, day toggles, row progress, responsive layout, and focused verification. Keep the existing habit management scaffold, analytics cards, and authentication intact. No screenshot was attached to this turn; use the requested clean, bright SaaS design direction.

This phase was superseded by the user's Phase 5 request after tracker implementation changes but before its browser verification. Preserve those changes; the Phase 5 verification gates will also catch integration regressions.

### Phase 4 task list

- [ ] Inspect tracker components, date utilities, entry action/DAL, and Next.js 16 mutation guidance.
- [ ] Validate selected months and real calendar dates; use user-local date strings consistently.
- [ ] Build responsive sticky-column tracker with Habit, Goal, Progress, weekday/date headers, and row-local optimistic toggles with rollback/error.
- [ ] Validate entry writes against session user, habit ownership, schedule, start date, archive state, and future-date policy; preserve unique database entry constraint.
- [ ] Add focused tests for 28/29/30/31-day months and row progress.
- [ ] Verify toggling, persistence, month navigation, and desktop/mobile behavior in a browser.
- [ ] Run typecheck, lint, tests, and production build; stop after Phase 4.

## Approved Phase 5 scope (2026-10-05)

Derive monthly progress, daily and weekly series, and top habits from the selected month's habits and entries. Derive accurate streaks from eligible completion dates through the selected month's cutoff, including prior months as needed for boundaries and all-time best. No statistics are persisted. The UI uses the existing tracker as its anchor, with responsive cards and accessible chart summaries.

This phase was superseded by the user's Phase 7 request after some analytics corrections and UI changes. Those changes remain in the workspace and will be checked for compatibility, but Phase 5 verification was not completed.

### Phase 5 task list

- [ ] Define streak and no-applicable-day semantics in pure analytics code and documentation.
- [ ] Correct monthly, daily, weekly, top habit, and streak calculations; add tests for edge cases and tie ordering.
- [ ] Fetch only the selected month for month analytics and a narrow active-habit completion history for streaks.
- [ ] Polish overall progress, donut, line, weekly bar, top habits, and streak cards in a responsive dashboard.
- [ ] Add route loading state and accessible chart text/empty states.
- [ ] Run typecheck, lint, unit/browser tests, production build, and visual verification.

## Approved Phase 7 scope (2026-10-05)

Extend schedules to daily, selected weekdays, weekdays, weekends, and a flexible X-times-per-week quota. Retain the existing schedule encoding for old habits. Add an optional end date, category search/filter, accessible drag ordering, and archived habit management. Keep future and pre-start days out of denominators. Fixed-schedule off-days show a dash; flexible weekly quotas have no fixed off-days and need separate weekly opportunity math.

### Phase 7 task list

- [ ] Audit current scheduling, habit form/list, analytics, and schema for backward compatibility.
- [ ] Define and test fixed-day and flexible weekly quota semantics.
- [ ] Add end-date migration and update forms/actions/DAL with server-side validation and user scoping.
- [ ] Add category search/filter, drag ordering with keyboard fallback, and archived management controls.
- [ ] Update grid applicability and all analytics to use the schedule semantics.
- [ ] Run migration, typecheck, lint, tests, production build, and browser verification.
