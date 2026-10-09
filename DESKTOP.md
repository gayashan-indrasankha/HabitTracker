# LifeOS for Windows

`npm run desktop:package` builds a portable Windows executable in `dist-desktop/`. Double-click `LifeOS <version>.exe` to open it. No Docker, PostgreSQL installation, Node.js installation, or internet connection is required on the destination PC. The portable executable extracts its runtime when opened, so its first launch may take longer than later launches.

LifeOS stores its database and encrypted session secret in the current Windows user's LifeOS application data directory. If a previous HabitFlow desktop database exists, LifeOS continues using that directory so existing accounts and habits remain available. Moving the executable to another PC does **not** move that data. Back up the application data directory before replacing or moving a PC; do not copy a live database while LifeOS is running. The desktop database is separate from local Docker PostgreSQL and Neon; this package does not import existing cloud or Docker accounts and habits.

The desktop process starts an embedded PGlite database, applies the checked-in Drizzle migrations, and starts the Next.js standalone server on a random loopback port. The app opens that server in a locked-down Electron window. It binds only to `127.0.0.1`. Other software running on the same Windows machine can technically reach loopback ports, so use the desktop build on a trusted PC and keep Windows user accounts separate.

## Build from source

On Windows with Node.js installed:

1. `npm ci`
2. `npm run typecheck && npm run lint && npm test`
3. `npm run desktop:package`
4. Open the generated file in `dist-desktop/`.

The build creates a Next.js standalone server and packages Electron, PGlite, migrations, and static assets into a single portable `.exe`. The generated output is ignored by Git. The executable is currently unsigned; Windows may show a publisher warning when opening an unsigned binary. A release distributed to others should be code signed.

The web deployment and its Neon database remain separately configured in [DEPLOYMENT.md](DEPLOYMENT.md).

For a noninteractive desktop runtime check after `npm run build`, run `npm run desktop:smoke`. It starts a fresh temporary PGlite database, applies all checked-in migrations, registers a test account, and requests Today, Week, Goals, Review, the old Dashboard, and JSON export through the standalone server. It does not open an Electron window or touch the usual desktop application data directory.

Release verification distinguishes this server smoke from opening the packaged `.exe`. The Windows CI job builds and inspects the portable bundle, then runs `node tests/desktop/portable.mjs` against its packaged Electron executable to verify a real window, authenticated writes, and persistence after a clean restart at either desktop or mobile window widths. The NSIS launcher itself requires a separate direct launch check because Playwright attaches to the child Electron process. See [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for observed results and remaining desktop checks.
