# Chores

[![Deploy](https://github.com/TwoEyedHuman/chores/actions/workflows/deploy.yml/badge.svg)](https://github.com/TwoEyedHuman/chores/actions/workflows/deploy.yml)

> A two-person household chore tracker: see what's due, tap to record that you did it.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Environment Strategy](#environment-strategy)
5. [Pre-Flight Checklist](#pre-flight-checklist)
6. [Implementation Stories](#implementation-stories)
7. [Secrets & Config Management](#secrets--config-management)
8. [Definition of Done](#definition-of-done)

---

## Architecture Overview

```
                    ┌──────────────────────────────┐
   Browser  ──────► │  Fly.io edge (TLS, anycast)  │
   (phone/desktop)  │  chores.brandonlocke.xyz     │
                    └──────────────┬───────────────┘
                                   │ :3000
                    ┌──────────────▼───────────────┐
                    │  Single Fly Machine          │
                    │  shared-cpu-1x / 256MB       │
                    │  auto_stop / auto_start      │
                    │  min_machines_running = 0    │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │ SvelteKit (node adapter)│ │
                    │  │  · form actions / SSR   │ │
                    │  │  · session cookie auth  │ │
                    │  │  · Drizzle ORM          │ │
                    │  └───────────┬────────────┘  │
                    └──────────────┼───────────────┘
                                   │ file I/O
                    ┌──────────────▼───────────────┐
                    │  Fly Volume (1GB) @ /data    │
                    │  chores.db  (SQLite, WAL)    │
                    └──────────────────────────────┘

Local dev:  Browser ─► Caddy :8080 ─► SvelteKit :3000 ─► ./data/chores.db
```

### Key Design Decisions

- **SQLite on a Fly Volume, not a separate database service.** Fly has no NoSQL offering of its own — the storage lineup is Fly Volumes for disk, Tigris for object storage, Upstash for Redis as the one managed extension, and Fly Postgres, which you deploy and operate yourself. Upstash Redis is cache-shaped and a poor fit for querying chores by room/assignee/frequency; Fly Postgres means a second machine and a second volume for a two-user app. SQLite in-process costs one 1GB volume (~$0.15/mo) and has zero connection management. The tradeoff is that the volume pins the app to a single machine in a single region — acceptable here, and it must stay at `count = 1`.

- **Scale-to-zero with a cold-start tax.** `min_machines_running = 0` means compute bills only while someone is actually using the app; Fly does not bill CPU/RAM for stopped machines. First request after an idle period pays a 2–5s cold start. Fine for a chore list checked a few times a day.

- **SvelteKit as a single full-stack container.** Server-rendered pages plus form actions mean no separate API service, no client-side auth token handling, and no JSON layer to maintain. One Dockerfile, one deploy.

- **Active/inactive is derived, never stored.** A chore has no `status` column. `is_active` is computed at query time from `frequency` and the most recent `completions.completed_at`. A recurring chore is *inactive* while `now - last_completed < frequency_interval`; a one-off chore is inactive permanently once it has any completion. This makes "mark performed" a single `INSERT` regardless of the chore's current state, which is exactly the behavior required for the inactive-card button.

- **Delete is an archive, not a `DELETE`.** The delete button sets `chores.archived = 1`. The chore vanishes from every list and filter immediately, which is the behavior you want from a delete button, but its completion history survives — a hard delete would cascade and destroy the record of every time either of you did that chore. This also makes undo trivial: restoring is `archived = 0`, not a volume-snapshot recovery.

- **Delete is unguarded, with an undo window.** There is no confirmation dialog. Tapping Delete archives the chore immediately and redirects to the list, where a toast offers **Undo** for 6 seconds. Deletes here are rare and deliberate, so a confirm step would tax every real delete to protect against an unlikely misfire; the undo window costs nothing on the common path and still catches the mistake. The escape hatch after the window closes is a manual `UPDATE chores SET archived = 0`.

- **Sessions in the database, no signup flow.** Two accounts, created by a CLI script. There is no registration route, no password reset, no email. A `sessions` table plus an `HttpOnly` cookie is the whole auth surface.

- **Extensibility mechanism:** frequency behavior lives entirely in `src/lib/server/frequency.ts` as a single exported map — interval in days, display label, sort rank, and CSS color token per frequency. Adding a frequency (say, "Semi-weekly") means adding one entry to that map plus one CSS custom property; no query, component, or route changes. Rooms are database rows seeded from `scripts/seed-rooms.ts`, so adding a room is a data change, not a code change.

### Domain Rules

**Frequency intervals** — a recurring chore is inactive for this long after its last completion:

| Frequency | Interval | Sort rank | Color |
|---|---|---|---|
| Daily | 1 day | 1 | Blue |
| Weekly | 7 days | 2 | Green |
| Monthly | 30 days | 3 | Light yellow |
| Quarterly | 91 days | 4 | Amber |
| Bi-annual | 182 days | 5 | Purple |
| Annual | 365 days | 6 | Purple |
| One-off | ∞ (never recurs) | 7 | Orange |

> **Open decision:** you specified colors for daily/weekly/monthly, "bi-annually and beyond" as purple, and one-off as orange, which leaves quarterly unassigned. Amber is the placeholder — it sits visually between light yellow and purple. Change the token in `app.css` if you'd rather it be something else.

**List ordering:** chores are grouped by frequency in the sort-rank order above, and every inactive chore — regardless of frequency — falls into a single **Inactive** group pinned to the bottom of the list. Within a group, order by chore title.

**Assignment:** `assignee_user_id` is nullable. `NULL` means "either of us."

The assignee filter offers **All / Brandon / Wife**. Selecting a person shows chores assigned to that person **plus** chores assigned to Either — the practical question is "what could I go do right now," and shared chores always qualify. There is no standalone "Either only" option; it would be redundant with the intersection of the two person filters and adds a third choice for a case that rarely comes up.

---

## Repository Structure

```
chores/
├── README.md
├── .gitignore
├── .env.example                    ← committed; .env is gitignored
│
├── .github/
│   └── workflows/
│       └── deploy.yml              ← test + fly deploy on push to main
│
├── docker-compose.yml              ← local dev: caddy + app
├── docker-compose.prod.yml         ← local smoke test of the production image
├── Caddyfile                       ← local only (see note below)
├── Makefile
├── Dockerfile                      ← multi-stage: build → node:22-slim runtime
├── fly.toml
├── drizzle.config.ts
├── package.json
├── svelte.config.js
├── vite.config.ts
│
├── drizzle/                        ← generated SQL migrations, committed
│   └── .gitkeep
│
├── scripts/
│   ├── seed-users.ts               ← create/update the two accounts
│   └── seed-rooms.ts               ← idempotent room list
│
├── static/                         ← MUST EXIST for the Docker build
│   └── .gitkeep
│
├── data/                           ← gitignored; local SQLite file lives here
│   └── .gitkeep
│
└── src/
    ├── app.html
    ├── app.css                     ← Tailwind entry + frequency color tokens
    ├── hooks.server.ts             ← session lookup, route guard
    │
    ├── lib/
    │   ├── types.ts
    │   ├── components/
    │   │   ├── ChoreCard.svelte
    │   │   ├── FilterBar.svelte
    │   │   ├── FrequencyChips.svelte
    │   │   └── Toast.svelte
    │   ├── stores/
    │   │   └── toast.ts             ← survives navigation; lives in the root layout
    │   └── server/
    │       ├── db/
    │       │   ├── index.ts        ← better-sqlite3 handle, WAL pragma
    │       │   └── schema.ts       ← Drizzle table definitions
    │       ├── auth.ts             ← argon2 hash/verify, session create/destroy
    │       ├── frequency.ts        ← FREQUENCIES map: interval, label, rank, color
    │       └── chores.ts           ← grouped query, activity derivation, completion insert
    │
    └── routes/
        ├── +layout.svelte
        ├── +layout.server.ts       ← exposes user to all pages
        ├── +page.svelte            ← chore list
        ├── +page.server.ts         ← load (filters) + markPerformed action
        ├── login/
        │   ├── +page.svelte
        │   └── +page.server.ts
        ├── logout/
        │   └── +server.ts
        └── chores/
            ├── new/
            │   ├── +page.svelte
            │   └── +page.server.ts
            └── [id]/
                └── edit/
                    ├── +page.svelte
                    └── +page.server.ts
```

> **No `Caddyfile.prod`.** Fly's edge terminates TLS and proxies straight to the Node process, so a production Caddy layer would add a hop and a process for nothing. Caddy exists locally only, to keep `localhost:8080` consistent with the other projects.

---

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | SvelteKit 2 (`adapter-node`) | SSR + form actions = no separate API service; matches existing Svelte experience |
| Runtime | Node 22 LTS | Supported by `adapter-node` and `better-sqlite3` prebuilds |
| Styling | Tailwind CSS | Frequency colors as CSS custom properties; fast to build card layouts |
| Database | SQLite via `better-sqlite3` | In-process, no connection pool, no second machine |
| ORM / migrations | Drizzle ORM + `drizzle-kit` | Typed schema, generated SQL migrations committed to the repo |
| Auth | `@node-rs/argon2` + DB-backed sessions | Two accounts, no signup; argon2id is the current password-hashing default |
| Proxy | Caddy 2 | Local reverse proxy only; Fly terminates TLS in prod |
| Containers | Docker + Compose | Consistent across envs |
| Hosting | Fly.io | Docker-native, scale-to-zero, volume-backed persistence |
| Storage | Fly Volume (1GB) @ `/data` | ~$0.15/GB/mo; first 10GB of snapshots free |
| DNS | Namecheap → Fly.io | Domain already registered; direct CNAME, no Cloudflare layer |
| CI/CD | GitHub Actions + `superfly/flyctl-actions` | Push to `main` runs tests, then `flyctl deploy --remote-only` |

**Estimated monthly cost:** ~$0.15–0.50. One 1GB volume, plus rootfs storage for the stopped machine (billed at $0.15/GB-month while stopped), plus negligible compute for the minutes per day the machine is awake.

---

## Environment Strategy

| | Local | Production |
|---|---|---|
| Domain | `localhost:8080` | `chores.brandonlocke.xyz` |
| TLS | none | Fly.io (automatic, `fly certs`) |
| Database | `./data/chores.db` (bind mount) | `/data/chores.db` (Fly Volume) |
| Secrets | `.env` file | `fly secrets set` |
| Deploy | `make dev` | push to `main` → GitHub Actions → `flyctl deploy` (`make deploy` as manual fallback) |
| Users | seeded via `make seed-users` | seeded via `fly ssh console` → `node scripts/seed-users.js` |

> There is no dev server tier. The app is small enough that local and production are the only two environments worth maintaining.

---

## Pre-Flight Checklist

Run before first `docker compose build` and after any environment change:

```bash
# Docker is running
docker info > /dev/null && echo "✓ Docker running" || echo "✗ Docker not running"

# DNS works from Docker (if this fails, restart Docker daemon)
docker run --rm alpine nslookup registry-1.docker.io && echo "✓ Docker DNS ok"

# Required ports are free
lsof -i :8080 -i :3000 | grep LISTEN && echo "⚠ ports in use" || echo "✓ ports free"

# .env exists
test -f .env && echo "✓ .env found" || echo "✗ copy .env.example to .env"

# Local data directory exists and is writable
test -w ./data && echo "✓ ./data writable" || echo "✗ mkdir -p ./data"

# Fly CLI authenticated (needed from Epic 6 onward)
fly auth whoami && echo "✓ Fly authenticated" || echo "✗ Run fly auth login"
```

If Docker DNS fails: `sudo systemctl restart docker` then re-run.

> **Ctrl+C not responding?** If `docker compose up` hangs on stop, your services are missing `stop_grace_period`. All services in `docker-compose.yml` should have `stop_grace_period: 5s`. Without it, Docker waits the full 10-second default before force-killing, and a stuck container can make the terminal unresponsive.

> **`better-sqlite3` and Alpine.** `better-sqlite3` is a native module. Use `node:22-slim` (Debian) rather than `node:22-alpine` for both build and runtime stages, or you will be compiling against musl and rebuilding on every deploy.

---

## Implementation Stories

### Story Template

Each story is one Claude CLI session. Keep them tight.

```
#### Story X.Y — Title
**Context:** What already exists. What this story builds on. (2-3 sentences max)
**Assumptions:**
- List explicit prerequisites — files, env vars, mounted volumes, running services
- If an assumption is wrong, the story will fail; fix the assumption first
**Tasks:**
- Imperative, specific, one action per bullet
- Include file paths
- Call out any SOLID principles or patterns to follow
**Out of Scope:**
- Anything that might tempt scope creep
**Acceptance Criteria:**
- [ ] Component-level: unit tests pass, binary builds, etc.
- [ ] Integration: `docker compose up` — all containers stay running
- [ ] At least one `curl` or browser check against the running stack
- [ ] No secrets committed; `.env` pattern followed
```

---

### Epic 1 — Foundation & Data Layer

**Epic Goal:** A running containerized SvelteKit app with a migrated SQLite schema and seeded rooms.

#### Story 1.1 — Project Scaffold

**Context:** Empty repository. Nothing exists yet.

**Assumptions:**
- Docker and Docker Compose are installed and running.
- Node 22 available locally for scaffolding commands (optional — can run inside the container).

**Tasks:**
- Scaffold a SvelteKit 2 project at the repo root (TypeScript, no test framework prompt needed beyond Vitest).
- Install and configure `@sveltejs/adapter-node` in `svelte.config.js`.
- Install and configure Tailwind CSS; create `src/app.css` with the Tailwind directives.
- Write `Dockerfile` as a multi-stage build: `node:22-slim` builder → `node:22-slim` runtime. Do **not** use Alpine (native `better-sqlite3` module).
- Write `docker-compose.yml` with two services: `app` (build from `Dockerfile`, expose 3000, bind-mount `./data:/data`) and `caddy` (port 8080). Every service gets `stop_grace_period: 5s`.
- Write `Caddyfile` — reverse proxy `localhost:8080` → `app:3000`.
- Write `docker-compose.prod.yml` for smoke-testing the production image locally.
- Create `static/.gitkeep` and `data/.gitkeep`.
- Write `.gitignore` (`node_modules`, `.env`, `data/*.db*`, `.svelte-kit`, `build`).
- Write `.env.example` with `DATABASE_PATH`, `SESSION_SECRET`, `ORIGIN`, `NODE_ENV`.
- Write `Makefile` with targets: `dev`, `build`, `down`, `logs`, `sh`.

**Out of Scope:**
- Any database schema, auth, or chore code.
- Fly.io configuration.

**Acceptance Criteria:**
- [ ] `docker compose up` — both containers start and stay running.
- [ ] `curl http://localhost:8080` returns the default SvelteKit page HTML.
- [ ] Browser check: `http://localhost:8080` loads without console errors.
- [ ] `make down` stops cleanly within ~5 seconds.
- [ ] `.env` is gitignored; `.env.example` is committed with no real values.

---

#### Story 1.2 — Schema, Migrations, and Room Seed

**Context:** Story 1.1 produced a running but empty SvelteKit container. This story adds the persistence layer.

**Assumptions:**
- `docker compose up` works and `./data` is bind-mounted to `/data` in the `app` container.
- `DATABASE_PATH` is set in `.env` (local value: `/data/chores.db`).

**Tasks:**
- Install `better-sqlite3`, `drizzle-orm`, and `drizzle-kit`.
- Write `src/lib/server/db/schema.ts` with four tables:
  - `users` — `id` (text PK), `username` (unique), `password_hash`, `display_name`
  - `rooms` — `id` (text PK), `name` (unique), `sort_order` (integer)
  - `chores` — `id` (text PK), `title`, `notes` (nullable), `frequency` (text), `room_id` (FK → rooms), `assignee_user_id` (nullable FK → users), `archived` (integer boolean, default 0), `created_at`
  - `completions` — `id` (text PK), `chore_id` (FK → chores, cascade delete), `user_id` (**nullable** FK → users), `completed_at` (integer, unix ms)
- Make `completions.user_id` nullable deliberately: backdated "date last performed" entries from the add-chore form have no performer attached.
- Add an index on `completions(chore_id, completed_at DESC)`.
- Write `src/lib/server/db/index.ts` — open the database at `DATABASE_PATH`, set `journal_mode = WAL` and `foreign_keys = ON`, export a singleton Drizzle handle.
- Write `drizzle.config.ts`; generate the initial migration into `drizzle/` and commit it.
- Run migrations automatically on server startup (in `src/hooks.server.ts` or a module imported by it) so deploys are self-migrating.
- Write `src/lib/server/frequency.ts` exporting a single `FREQUENCIES` record keyed by `daily | weekly | monthly | quarterly | biannual | annual | one_off`, each with `{ label, intervalDays, sortRank, colorToken }`. `one_off` has `intervalDays: null`.
- Add the frequency color custom properties to `src/app.css`.
- Write `scripts/seed-rooms.ts` — idempotent upsert of: Kitchen, Living Room, Bedroom, Bathroom, Basement, Garage, Yard, Whole House.
- Add Makefile targets `migrate` and `seed-rooms`.

**Out of Scope:**
- User seeding (Story 2.1) and any chore query logic (Epic 3).
- Any UI.

**Acceptance Criteria:**
- [ ] `make migrate` applies migrations against `./data/chores.db` with no errors.
- [ ] `make seed-rooms` populates 8 rooms; running it twice does not duplicate rows.
- [ ] `sqlite3 ./data/chores.db ".schema"` shows all four tables with the expected columns and the completions index.
- [ ] `docker compose up` — containers stay running; migrations run on boot with no error in `make logs`.
- [ ] Deleting `./data/chores.db` and restarting recreates the schema automatically.

---

> **Gate — Epic 1 complete when:** `docker compose up` serves the app at `localhost:8080`, the SQLite file exists at `./data/chores.db` with all four tables, and rooms are seeded.

---

### Epic 2 — Authentication

**Epic Goal:** Two seeded accounts can log in and out; every page except `/login` requires a session.

#### Story 2.1 — Password Hashing and User Seed Script

**Context:** Epic 1 gives a migrated database with a `users` table. No accounts exist yet.

**Assumptions:**
- `make migrate` has been run and `users` exists.
- The `app` container can run `node`/`tsx` scripts.

**Tasks:**
- Install `@node-rs/argon2`.
- Write `src/lib/server/auth.ts` with `hashPassword(plain)` and `verifyPassword(hash, plain)` using argon2id defaults. Keep this module free of any SvelteKit imports so scripts can use it — single responsibility, no framework coupling.
- Write `scripts/seed-users.ts` — accepts username, display name, and password (prompt for the password; **never** read it from a committed file or a shell argument). Upserts by username so re-running rotates the password rather than erroring.
- Add Makefile target `seed-users`.

**Out of Scope:**
- Login routes, sessions, cookies (Story 2.2).
- Any password-strength or lockout policy.

**Acceptance Criteria:**
- [ ] `make seed-users` creates a user; the stored `password_hash` starts with `$argon2id$`.
- [ ] Re-running for the same username updates the hash instead of inserting a duplicate.
- [ ] A short Vitest unit test confirms `verifyPassword` returns true for the correct password and false for a wrong one.
- [ ] No password appears in shell history, source, or `.env`.

---

#### Story 2.2 — Login, Logout, Sessions, and Route Guard

**Context:** Story 2.1 gives hashed users and a working seed script. There is still no way to log in.

**Assumptions:**
- At least one seeded user exists.
- `SESSION_SECRET` is set in `.env`.

**Tasks:**
- Add a `sessions` table to `src/lib/server/db/schema.ts` (`id` text PK, `user_id` FK, `expires_at` integer); generate and commit the migration.
- Extend `src/lib/server/auth.ts` with `createSession(userId)`, `validateSession(id)`, and `destroySession(id)`. Sessions last 30 days and refresh on use.
- Write `src/hooks.server.ts` — read the session cookie, resolve `event.locals.user`, and redirect unauthenticated requests to `/login` for every route except `/login` itself and static assets.
- Write `src/routes/login/+page.server.ts` with a form action that verifies credentials, creates a session, and sets an `HttpOnly`, `SameSite=Lax`, `Secure`-in-production cookie. On failure return a generic "Invalid username or password" — never reveal which field was wrong.
- Write `src/routes/login/+page.svelte` — username, password, submit, error message. Mobile-friendly.
- Write `src/routes/logout/+server.ts` — POST destroys the session and clears the cookie.
- Write `src/routes/+layout.server.ts` to expose `user` to all pages, and add a header with the display name and a logout button in `src/routes/+layout.svelte`.

**Out of Scope:**
- Chore list content — `/` can remain a placeholder that renders the logged-in user's name.
- Password reset, remember-me, CSRF beyond SvelteKit's built-in origin checking.

**Acceptance Criteria:**
- [ ] `curl -i http://localhost:8080/` returns a 302 to `/login` when unauthenticated.
- [ ] Browser check: logging in with correct credentials lands on `/` and shows the display name; wrong credentials show the generic error and stay on `/login`.
- [ ] Logout clears the cookie and a subsequent `/` request redirects to `/login`.
- [ ] The session cookie is `HttpOnly` (verify in devtools).
- [ ] `docker compose up` — containers stay running.

---

> **Gate — Epic 2 complete when:** both real accounts are seeded, login/logout works end to end in a browser, and no page other than `/login` is reachable without a session.

---

### Epic 3 — Chore Query Layer

**Epic Goal:** A tested server module that returns chores grouped and ordered correctly, and records completions.

#### Story 3.1 — Activity Derivation and Grouped Query

**Context:** Epics 1–2 give a migrated schema and working auth. The `chores` and `completions` tables exist but nothing reads them.

**Assumptions:**
- `FREQUENCIES` exists in `src/lib/server/frequency.ts` with `intervalDays` per frequency.
- Rooms are seeded.

**Tasks:**
- Write `src/lib/server/chores.ts` exporting `getChores(filters)` where filters are `{ frequency?, roomId?, assignee? }`.
- Implement `isActive(chore, lastCompletedAt)`: a `one_off` chore is inactive if it has any completion; every other chore is inactive if `now - lastCompletedAt < intervalDays * 86_400_000`; a chore with no completions is always active.
- Query chores with their most recent completion in one statement (correlated subquery or `LEFT JOIN` on a max-completed_at subquery) — do not N+1 per chore.
- Return a `ChoreGroup[]`: one group per frequency in `sortRank` order containing that frequency's *active* chores, plus a final `Inactive` group containing every inactive chore across all frequencies. Sort within groups by title. Omit empty groups.
- Exclude `archived = 1` chores entirely.
- Apply the assignee filter as: filtering by a user id matches `assignee_user_id = :id OR assignee_user_id IS NULL` — a person's chores always include the shared ones. No filter (`All`) matches everything.
- Define the shared `Chore`, `ChoreGroup`, and `Filters` types in `src/lib/types.ts`.
- Write Vitest tests against an in-memory SQLite database covering: never-completed chore is active; recurring chore completed yesterday with weekly frequency is inactive; the same chore completed 8 days ago is active; completed one-off is inactive forever; each filter narrows results correctly; filtering by a person returns both that person's chores and unassigned ones, and excludes the other person's.

**Out of Scope:**
- Recording completions (Story 3.2).
- Any UI or route code.

**Acceptance Criteria:**
- [ ] `npm test` passes with all activity-derivation cases green.
- [ ] Group ordering is Daily → Weekly → Monthly → Quarterly → Bi-annual → Annual → One-off → Inactive.
- [ ] A manual query against a hand-seeded database returns the expected grouping (verify via a temporary script or test).
- [ ] No query executes per-chore inside a loop.

---

#### Story 3.2 — Record Completion

**Context:** Story 3.1 gives a read path. This story adds the write path for the "I did this" button.

**Assumptions:**
- `getChores` works and is tested.
- `event.locals.user` is populated by the hooks from Story 2.2.

**Tasks:**
- Add `recordCompletion(choreId, userId, completedAt?)` to `src/lib/server/chores.ts` — inserts a row into `completions`, defaulting `completed_at` to now.
- Validate that the chore exists and is not archived; throw a typed error otherwise.
- Deliberately do **not** branch on the chore's active state: pressing the button on an inactive chore is the same insert and simply moves the last-performed date forward.
- Add Vitest coverage: recording a completion on an active weekly chore makes it inactive on the next `getChores` call; recording on an already-inactive chore updates its last-completed timestamp.

**Out of Scope:**
- Undo, completion history views, editing past completions.
- The UI button (Epic 4).

**Acceptance Criteria:**
- [ ] `npm test` passes, including the active → inactive transition test.
- [ ] Recording a completion for a nonexistent or archived chore raises the typed error rather than inserting.
- [ ] `completions.user_id` is populated when a user is supplied and accepts `null` when not.

---

> **Gate — Epic 3 complete when:** `npm test` covers activity derivation, grouping, filtering, and completion recording, and all tests pass.

---

### Epic 4 — Chore List UI

**Epic Goal:** The logged-in home page shows color-coded chore cards in the correct groups, each with a working "performed" button.

#### Story 4.1 — Chore Cards and Grouped List

**Context:** Epic 3 provides `getChores(filters)`. The `/` route is still an auth placeholder.

**Assumptions:**
- `FREQUENCIES` exposes a `colorToken` per frequency and matching CSS custom properties exist in `app.css`.
- Some chores exist in the local database (insert a handful manually or via a throwaway script for testing).

**Tasks:**
- Write `src/routes/+page.server.ts` with a `load` that calls `getChores` with no filters and returns the groups.
- Write `src/lib/components/ChoreCard.svelte` — title, room name, assignee display name (or "Either"), last-performed date (or "Never"), and a colored left border/accent driven by the frequency color token. Inactive cards render visually muted (reduced opacity or desaturated accent) while remaining fully legible.
- Write `src/routes/+page.svelte` — render group headings and their cards. Mobile-first single column; two columns at `md` and up.
- Format dates as relative where useful ("3 days ago") with the absolute date available as a `title` attribute.
- Render an empty state when there are no chores at all, distinct from "no chores match your filters."

**Out of Scope:**
- The performed button's behavior (Story 4.2).
- Filters (Epic 5) and the add-chore page (Story 5.2).

**Acceptance Criteria:**
- [ ] Browser check: `http://localhost:8080/` shows chores grouped Daily → … → One-off → Inactive with correct accent colors per frequency.
- [ ] Inactive chores appear only in the Inactive group, regardless of frequency, and are visually muted.
- [ ] A chore with no completions shows "Never."
- [ ] Layout is usable at 375px width without horizontal scroll.
- [ ] `docker compose up` — containers stay running.

---

#### Story 4.2 — Mark Performed

**Context:** Story 4.1 renders cards. The button exists visually but does nothing.

**Assumptions:**
- `recordCompletion` from Story 3.2 is available.
- The list page loads chores successfully.

**Tasks:**
- Add a `markPerformed` form action to `src/routes/+page.server.ts` that reads the chore id, calls `recordCompletion` with `locals.user.id`, and returns success.
- Wire the button in `ChoreCard.svelte` as a `<form method="POST" action="?/markPerformed">` with `use:enhance` so the list updates without a full navigation.
- Show the button on **every** card including inactive ones.
- Disable the button and show a pending state while the action is in flight to prevent double-submits.
- Surface action failures as a non-blocking message rather than a thrown error page.

**Out of Scope:**
- Undo or confirmation dialogs.
- Optimistic UI beyond the pending state.

**Acceptance Criteria:**
- [ ] Browser check: pressing the button on an active daily chore moves it into the Inactive group immediately.
- [ ] Pressing the button on an inactive chore updates its last-performed date to today and leaves it inactive.
- [ ] The button is disabled while submitting; rapid double-clicks produce one completion row.
- [ ] `sqlite3 ./data/chores.db "SELECT * FROM completions"` shows the expected rows with the correct `user_id`.

---

> **Gate — Epic 4 complete when:** the chore list renders correctly grouped and colored, and marking any chore performed — active or inactive — updates the list and writes a completion row.

---

### Epic 5 — Filters and Chore Management

**Epic Goal:** Chores can be narrowed by frequency, room, and assignee, and created, edited, and deleted entirely from the app.

#### Story 5.1 — Filter Bar

**Context:** Epic 4 renders the full unfiltered list. `getChores` already accepts a filters object that nothing populates.

**Assumptions:**
- `getChores(filters)` handles all three filters and is tested.
- Rooms and both users exist in the database.

**Tasks:**
- Write `src/lib/components/FrequencyChips.svelte` — a horizontally scrolling row of frequency chips (`overflow-x-auto`, no wrap, momentum scroll on touch, scrollbar hidden). Includes an "All" chip. Selected chip uses that frequency's color token.
- Write `src/lib/components/FilterBar.svelte` — the frequency chip row plus a room `<select>` and an assignee `<select>` (All / Brandon / Wife — each person includes shared "Either" chores).
- Drive all filter state through URL query parameters (`?frequency=weekly&room=kitchen&assignee=either`) so filters survive reload and are shareable; update via `goto` with `keepFocus` and `noScroll`.
- Read the query parameters in `+page.server.ts` and pass them to `getChores`.
- Add a visible "Clear filters" control when any filter is active.
- Render the distinct "no chores match your filters" empty state.

**Out of Scope:**
- Saved filter presets, sorting controls, text search.
- Filtering by active/inactive.

**Acceptance Criteria:**
- [ ] Browser check: selecting a frequency chip narrows the list and updates the URL; reloading preserves the selection.
- [ ] The room select filters correctly.
- [ ] Selecting "Brandon" shows Brandon's chores **and** Either chores, and hides chores assigned to Wife; the reverse holds for "Wife".
- [ ] Filters compose — frequency + room + assignee together return the intersection.
- [ ] The chip row scrolls horizontally at 375px width without breaking the layout.
- [ ] "Clear filters" returns to the full list and clears the query string.

---

#### Story 5.2 — Add Chore Page

**Context:** Chores currently have to be inserted by hand. This story adds the only write path for creating them.

**Assumptions:**
- Rooms are seeded and both users exist.
- `FREQUENCIES` is the source of truth for the frequency options.

**Tasks:**
- Write `src/routes/chores/new/+page.server.ts` with a `load` that supplies rooms and users, and a `create` action.
- Write `src/routes/chores/new/+page.svelte` with exactly these inputs: **Title** (text, required), **Room** (select, required), **Person** (select: Brandon / Wife / Either — required, "Either" stores `NULL`), **Frequency** (select, required, options generated from `FREQUENCIES`), **Date Last Performed** (date input, optional).
- On submit: insert the chore, and if "Date Last Performed" is supplied, insert a `completions` row backdated to that date with `user_id = NULL`.
- Reject a future "Date Last Performed" with a field-level validation error.
- Validate server-side and re-render the form with entered values preserved on failure — never lose the user's input.
- Redirect to `/` on success.
- Add an "Add chore" link/button in the layout header.

**Out of Scope:**
- Editing and deleting chores (Story 5.3).
- Room management UI (rooms stay seed-driven).
- The optional `notes` field on the card or form.

**Acceptance Criteria:**
- [ ] Browser check: creating a chore with no "Date Last Performed" lands it in the correct active frequency group showing "Never."
- [ ] Creating a weekly chore with yesterday's date puts it directly into the Inactive group.
- [ ] Creating a weekly chore with a date 10 days ago puts it in the active Weekly group.
- [ ] Submitting with a missing title returns to the form with an error and the other fields still filled in.
- [ ] A future date is rejected with a clear message.
- [ ] Selecting "Either" stores `NULL` in `assignee_user_id`, and the chore appears under both the Brandon and Wife assignee filters.

---

#### Story 5.3 — Edit and Delete a Chore

**Context:** Story 5.2 gives a create form and its validation logic. This story adds the edit screen, the long-press gesture that opens it, and delete.

**Assumptions:**
- `/chores/new` works, including server-side validation and the backdated-completion behavior.
- `ChoreCard.svelte` renders every chore and already contains a "performed" button.

**Tasks:**
- Add `updateChore(id, fields)` and `deleteChore(id)` to `src/lib/server/chores.ts`. `deleteChore` sets `archived = 1` — it does not remove rows. Both throw the typed not-found error for a missing or already-archived chore.
- Extract the create form's field markup and validation into a shared component and a shared validator so `/chores/new` and the edit page cannot drift apart — one definition of the field rules, used by both routes.
- Write `src/routes/chores/[id]/edit/+page.server.ts`: a `load` that returns the chore, rooms, and users (404 if the chore is missing or archived), plus `update` and `delete` actions.
- Write `src/routes/chores/[id]/edit/+page.svelte` with the same five inputs as the create form — Title, Room, Person, Frequency, Date Last Performed — pre-filled from the chore, and a visually distinct destructive Delete button separated from the save controls.
- "Date Last Performed" on edit maps to the chore's **most recent** completion: leaving it unchanged is a no-op; changing it updates that completion's `completed_at`; clearing it deletes the most recent completion row. Do not insert a duplicate completion on every save.
- Add `restoreChore(id)` to `src/lib/server/chores.ts` — sets `archived = 0`. It is the exact inverse of `deleteChore`; keep them adjacent so they cannot drift.
- Delete takes a single tap with no confirmation dialog. The action archives the chore and redirects to `/`.
- Write `src/lib/stores/toast.ts` — a writable store holding at most one toast (`{ message, actionLabel, action, timeoutMs }`), with `show()` and `dismiss()`. It must live outside any page component so it survives the redirect from the edit page to `/`; the delete action sets it before navigating.
- Write `src/lib/components/Toast.svelte` — fixed to the bottom of the viewport above the safe-area inset, showing the message and an action button. Auto-dismisses after 6 seconds; hovering or focusing it pauses the timer so the button can't slide out from under a pointer. Mount it once in `src/routes/+layout.svelte`.
- Add a `restore` form action to `src/routes/+page.server.ts`; the toast's Undo button submits to it with `use:enhance`, then dismisses the toast and refreshes the list.
- A second delete while a toast is showing replaces the toast rather than stacking — the pending undo target is always the most recent delete.
- Give the toast `role="status"` and `aria-live="polite"` so the message is announced, and make the Undo button reachable by Tab.
- Add long-press to `ChoreCard.svelte`: a `pointerdown` timer of 500ms navigates to that chore's edit page. Cancel the timer on `pointerup`, `pointercancel`, `pointerleave`, and on any pointer movement beyond ~10px so scrolling never triggers it. Call `preventDefault` on the resulting `contextmenu` event so mobile browsers don't show their own menu.
- Exclude the performed button's subtree from the gesture — a long press on the button must not open the edit screen.
- Give a brief visual acknowledgement while the press is being held (a subtle scale or highlight) so the gesture is discoverable rather than accidental.
- Add a keyboard- and screen-reader-accessible route to the same page: a visually subtle "Edit" link in each card, focusable and labeled with the chore title. A long-press gesture alone is not operable without a pointer.

**Out of Scope:**
- Restoring a chore after the undo window has closed (`UPDATE chores SET archived = 0` by hand), and any "Deleted chores" screen.
- A general-purpose toast queue — one toast at a time is the whole requirement.
- Undo for anything other than delete (marking performed stays irreversible in the UI).
- Editing or viewing the full completion history.
- Bulk edit, drag-to-reorder, or swipe gestures.
- Room management UI.

**Acceptance Criteria:**
- [ ] Browser check on a touch device or emulator: pressing and holding a chore card for ~half a second opens its edit page with all five fields pre-filled.
- [ ] Scrolling the list by dragging from a card does **not** open the edit page.
- [ ] Long-pressing the performed button records a completion and does not open the edit page.
- [ ] The "Edit" link is reachable by Tab and activates with Enter.
- [ ] Changing frequency from Weekly to Monthly re-groups the chore on return to `/`.
- [ ] Saving without touching "Date Last Performed" leaves `completions` row count unchanged.
- [ ] Changing "Date Last Performed" to 10 days ago moves a weekly chore from Inactive into the active Weekly group.
- [ ] Clearing "Date Last Performed" on a chore with one completion makes it show "Never."
- [ ] Tapping Delete once removes the chore from every list and filter with no confirmation dialog, and `sqlite3 ./data/chores.db "SELECT archived FROM chores WHERE id='…'"` returns 1 with its completion rows intact.
- [ ] A toast appears at the bottom of `/` naming the deleted chore, and survives the redirect from the edit page.
- [ ] Tapping Undo restores the chore to its original group with its completion history and last-performed date unchanged.
- [ ] The toast auto-dismisses after ~6 seconds; the delete stands and the chore stays hidden.
- [ ] Hovering or focusing the toast pauses its dismissal timer.
- [ ] Deleting a second chore while a toast is showing replaces it; Undo then restores the second chore, not the first.
- [ ] The Undo button is reachable by Tab and activates with Enter.
- [ ] Navigating directly to the edit URL of a deleted chore returns a 404, not a crash.
- [ ] Validation errors behave identically on the edit and create forms (shared validator is actually shared).

---

> **Gate — Epic 5 complete when:** all three filters work and compose correctly from the URL; a chore created through the form appears in the right group with the right last-performed state; and a chore can be long-pressed to edit, re-saved with changed fields, and deleted in one tap with a working undo toast.

---

### Epic 6 — Deploy & Domain

**Epic Goal:** The app is live at `https://chores.brandonlocke.xyz`, backed by a persistent volume, scaling to zero when idle.

#### Story 6.1 — Production Image, fly.toml, and Deploy Targets

**Context:** Epics 1–5 produce a complete working app locally. Nothing is deployed. This story prepares deployment but does not deploy.

**Assumptions:**
- `flyctl` is installed and `fly auth whoami` succeeds.
- `docker compose -f docker-compose.prod.yml up` builds and serves the production image locally.

**Tasks:**
- Finalize the multi-stage `Dockerfile`: build stage runs `npm ci && npm run build`, runtime stage is `node:22-slim` with production dependencies only and `build/index.js` as the entrypoint.
- Confirm `better-sqlite3` resolves correctly in the runtime stage (rebuild in the builder and copy `node_modules`, or install production deps in the runtime stage).
- Write `fly.toml` at the repo root:
  - `app = "chores-brandonlocke"`, `primary_region` set to a nearby region (`ewr` or `iad`).
  - `[http_service]` with `internal_port = 3000`, `force_https = true`, `auto_stop_machines = "stop"`, `auto_start_machines = true`, `min_machines_running = 0`.
  - `[[vm]]` — `shared-cpu-1x`, 256MB (bump to 512MB if the build or runtime OOMs).
  - `[[mounts]]` — `source = "chores_data"`, `destination = "/data"`.
  - `[env]` — `DATABASE_PATH = "/data/chores.db"`, `NODE_ENV = "production"`, `ORIGIN = "https://chores.brandonlocke.xyz"`.
- Add Makefile targets: `deploy`, `fly-logs`, `fly-status`, `fly-ssh`.
- Commit `fly.toml` to the repository — it must **not** be gitignored, since the GitHub Actions workflow in Story 6.4 reads it during the deploy.
- Confirm startup migrations run against `/data/chores.db`, not a bundled path.

**Out of Scope:**
- Creating the Fly app, volume, or deploying (Story 6.2).
- DNS (Story 6.3).

**Acceptance Criteria:**
- [ ] `docker compose -f docker-compose.prod.yml up` serves the production build and login works against it locally.
- [ ] `fly config validate` passes (or `fly.toml` is visually verified against Fly's schema if the app does not yet exist).
- [ ] The production image contains no dev dependencies and no `.env` file.
- [ ] New Makefile targets invoke the correct `flyctl` commands.

---

#### Story 6.2 — Fly App, Volume, Secrets, and First Deploy

**Context:** Story 6.1 produced a validated `fly.toml` and a working production image. This story ships it.

**Assumptions:**
- `flyctl` is authenticated.
- `fly.toml` is present and reviewed.

**Tasks:**
- Run `fly apps create chores-brandonlocke` (or `fly launch --no-deploy`, reusing the existing `fly.toml` and `Dockerfile` — do not let it overwrite them).
- Create the volume: `fly volumes create chores_data --size 1 --region <primary_region>`.
- Set secrets: `fly secrets set SESSION_SECRET=$(openssl rand -base64 32)`.
- Run `make deploy`.
- Confirm exactly one machine exists (`fly scale count 1`) — the volume cannot be shared across machines.
- Seed rooms and both user accounts on production via `fly ssh console`, entering passwords interactively.
- Verify scale-to-zero: after an idle period, `fly machine list` shows the machine stopped; a new request starts it.
- Verify persistence: create a chore, force a machine restart (`fly machine restart`), confirm the chore survives.

**Out of Scope:**
- Custom domain and TLS (Story 6.3).
- Application code changes.
- Automated deploys (Story 6.4) — this story deploys manually via `make deploy`.

**Acceptance Criteria:**
- [ ] `fly status` shows the app deployed and healthy with one machine.
- [ ] Browser check: `https://chores-brandonlocke.fly.dev` — login, chore list, filters, mark performed, add chore, and long-press to edit all work.
- [ ] A chore created in production survives `fly machine restart`.
- [ ] `fly machine list` shows the machine stopped after idle and started again on the next request.
- [ ] `SESSION_SECRET` is set via `fly secrets` and appears nowhere in the repo.

---

#### Story 6.3 — Namecheap DNS and Custom Domain

**Context:** Story 6.2 has the app live on `.fly.dev`. This story puts it on the real hostname with valid HTTPS.

**Assumptions:**
- `brandonlocke.xyz` is registered in Namecheap with DNS management access.
- The app responds correctly at `chores-brandonlocke.fly.dev`.

**Tasks:**
- Run `fly certs add chores.brandonlocke.xyz` and note the DNS records Fly requires.
- In Namecheap Advanced DNS for `brandonlocke.xyz`, add the record(s) Fly specifies for the `chores` host — typically a CNAME to the app's `.fly.dev` hostname, or A/AAAA records to Fly's anycast addresses per `fly certs show`.
- Add the ACME validation CNAME if Fly requests one.
- Run `fly certs check chores.brandonlocke.xyz` until the certificate is issued; allow for DNS propagation.
- Confirm `ORIGIN` in `fly.toml` matches the final hostname and redeploy if it was changed — a mismatched `ORIGIN` breaks SvelteKit form actions with a CSRF error.

**Out of Scope:**
- `www` variants, redirects, or additional subdomains.
- Application changes.

**Acceptance Criteria:**
- [ ] `fly certs check chores.brandonlocke.xyz` reports a valid issued certificate.
- [ ] `curl -I https://chores.brandonlocke.xyz` returns 200 or 302 with no TLS errors.
- [ ] Browser check on a phone: log in, filter, mark a chore performed, and add a chore — all succeed over the custom domain.
- [ ] Form submissions succeed (confirms `ORIGIN` is correct).
- [ ] Idle-then-request test: after inactivity, loading the custom domain wakes the machine and serves the app within a few seconds.

---

#### Story 6.4 — Continuous Deployment from GitHub

**Context:** Story 6.3 has the app live on the custom domain, deployed manually with `make deploy`. This story makes a push to `main` deploy it.

**Assumptions:**
- The repository is pushed to GitHub and `main` is the default branch.
- `fly.toml` is committed at the repo root (Story 6.1).
- The Fly app exists and a manual `make deploy` has succeeded at least once — do not debug a first deploy through CI.

**Tasks:**
- Generate an app-scoped deploy token: `fly tokens create deploy -x 999999h`. Copy the **entire** output including the leading `FlyV1` and the space after it. Prefer this over `fly auth token`, which grants access to every app in the org.
- Add it as the repository secret `FLY_API_TOKEN` under Settings → Secrets and variables → Actions.
- Write `.github/workflows/deploy.yml`:
  - Trigger on `push` to `main`, plus `workflow_dispatch` for manual runs.
  - `concurrency: deploy-group` so two pushes in quick succession can't deploy over each other.
  - Steps: `actions/checkout@v4` → `actions/setup-node@v4` (Node 22, npm cache) → `npm ci` → `npm test` → `superfly/flyctl-actions/setup-flyctl@master` → `flyctl deploy --remote-only`.
  - `FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}` in the deploy step's `env`.
- Gate the deploy on the test step: a failing `npm test` must abort before `flyctl deploy` runs.
- Use `--remote-only` so the image builds on Fly's builder rather than the runner — this avoids compiling the native `better-sqlite3` module in a different environment than production.
- Keep the `make deploy` target working as a manual escape hatch for when Actions is down or a hotfix can't wait.
- Add a build-status badge to the top of this README.

**Out of Scope:**
- Preview/review apps for pull requests.
- Automated migrations beyond the existing on-boot migration step.
- Staging environments, deploy approvals, or rollback automation (`fly releases` + `fly deploy --image` by hand if needed).
- Seeding users or rooms from CI — those stay interactive over `fly ssh console`.

**Acceptance Criteria:**
- [ ] Pushing a trivial change to `main` triggers the workflow and the change is live at `https://chores.brandonlocke.xyz` within a few minutes.
- [ ] A commit that breaks a test fails the workflow at the test step and **does not** deploy — verify deliberately, then revert.
- [ ] `workflow_dispatch` runs the same workflow manually from the Actions tab.
- [ ] The deploy respects the single-machine constraint: `fly status` still shows exactly one machine with the volume attached after a CI deploy.
- [ ] Data survives a CI deploy — create a chore, push a change, confirm the chore is still there.
- [ ] `FLY_API_TOKEN` exists only as a GitHub Actions secret; it appears nowhere in the repository or in workflow logs.
- [ ] The token is app-scoped (created with `fly tokens create deploy`), not an org-wide auth token.

---

> **Gate — Epic 6 complete when:** the app is reachable at `https://chores.brandonlocke.xyz` with a valid certificate, data persists across restarts and deploys, a push to `main` deploys automatically after tests pass, and the machine scales to zero when idle.

---

## Secrets & Config Management

All local configuration lives in `.env`, which is gitignored. `.env.example` is committed with placeholder values only.

| Variable | Local | Production | Notes |
|---|---|---|---|
| `DATABASE_PATH` | `/data/chores.db` (bind-mounted `./data`) | `/data/chores.db` (Fly Volume) | Same path both envs; different backing store |
| `SESSION_SECRET` | any dev string | `fly secrets set` | Generate with `openssl rand -base64 32` |
| `ORIGIN` | `http://localhost:8080` | `https://chores.brandonlocke.xyz` | Required by `adapter-node`; a mismatch breaks form actions |
| `NODE_ENV` | `development` | `production` | Set in `fly.toml` `[env]` |
| `FLY_API_TOKEN` | n/a | GitHub Actions repository secret | App-scoped deploy token from `fly tokens create deploy -x 999999h`; never in `.env` or `fly secrets` |

**Rules:**
- Passwords are never stored in `.env`, `fly secrets`, or any committed file — only argon2 hashes in the database, set interactively via `scripts/seed-users.ts`.
- The Fly deploy token lives only in GitHub's secret store. Use `fly tokens create deploy` (scoped to this one app), not `fly auth token` (full org access). Revoke with `fly tokens revoke` if it ever leaks.
- `fly.toml` is committed — the Actions workflow needs it — so it must contain no secret values. Only non-sensitive config goes in `[env]`.
- Non-sensitive production config (`DATABASE_PATH`, `ORIGIN`, `NODE_ENV`) lives in `fly.toml` `[env]`. Only `SESSION_SECRET` goes through `fly secrets`.
- Rotating `SESSION_SECRET` invalidates nothing on its own — sessions live in the database, so also truncate the `sessions` table if you need to force a logout.

---

## Definition of Done

A story is done when every one of its acceptance criteria is checked, and:

- [ ] `docker compose up` runs cleanly with no errors in `make logs`.
- [ ] `npm test` passes.
- [ ] The change was verified in a browser at `localhost:8080`, not only via `curl`.
- [ ] Nothing was committed that belongs in `.env` or `fly secrets`.
- [ ] The layout still works at 375px width — this app is used on phones.

The **project** is done when:

- [ ] Both accounts log in at `https://chores.brandonlocke.xyz`.
- [ ] Chores render grouped Daily → Weekly → Monthly → Quarterly → Bi-annual → Annual → One-off → Inactive, with correct colors.
- [ ] Every card, active or inactive, has a working performed button that updates the last-performed date.
- [ ] Frequency, room, and assignee filters work independently and together.
- [ ] Filtering by a person includes shared "Either" chores.
- [ ] New chores can be added from `/chores/new`, including a backdated last-performed date.
- [ ] Long-pressing a card opens its edit screen; chores can be edited, and deleted in one tap with a 6-second undo window.
- [ ] Data survives machine restarts and deploys.
- [ ] A push to `main` runs the tests and deploys automatically; a failing test blocks the deploy.
- [ ] The machine scales to zero when idle, and the monthly Fly bill is under $1.
