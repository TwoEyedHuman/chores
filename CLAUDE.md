# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A two-person household chore tracker: see what's due, tap to record you did it. SvelteKit 2 (adapter-node) + SQLite (`better-sqlite3` + Drizzle ORM), deployed as a single Docker container to Fly.io behind Caddy locally. Full design rationale, schema, and the story-by-story build plan live in `README.md` — read the relevant section there before implementing a story, it has context this file doesn't repeat.

## Commands

```bash
make dev            # npm run dev (outside Docker)
make build           # docker compose build
docker compose up    # local stack: caddy :8080 -> app :3000 -> ./data/chores.db
make down / make logs / make sh

npm test             # vitest run — single file: npx vitest run src/lib/server/chores.test.ts
npm run check         # svelte-kit sync && svelte-check

make migrate          # drizzle-kit migrate against ./data/chores.db
make seed-rooms
make seed-users USERNAME=alice DISPLAY_NAME="Alice"   # prompts for password interactively
```

After changing `src/lib/server/db/schema.ts`, generate a migration with `npx drizzle-kit generate` and commit the resulting `drizzle/*.sql` — migrations run automatically on server startup (via `src/lib/server/db/index.ts`, imported from `hooks.server.ts`), so nothing needs to be applied manually in Docker/Fly.

## Architecture

- **Single full-stack container, no API layer.** SvelteKit form actions do all reads and writes server-side; there's no client-side auth token or JSON API to keep in sync.
- **SQLite in-process** via `better-sqlite3`, one file at `DATABASE_PATH`, WAL mode, `foreign_keys = ON`. Fine for a two-user app; the whole point is zero connection management and one Fly Volume. Do not introduce a second database or a connection pool.
- **Active/inactive is derived, never stored.** No `status` column anywhere. A chore's active state is computed at query time in `src/lib/server/chores.ts` from `frequency` + the most recent `completions.completed_at`. "Mark performed" is always a plain `INSERT` into `completions`, regardless of current state — never branch write behavior on active/inactive.
- **Delete = archive, not `DELETE`.** `chores.archived = 1` hides a chore from every list/filter while preserving its completion history; `archived = 0` is the exact inverse (`restoreChore`). Never write a hard delete for chores.
- **Sessions in the DB, no signup flow.** Two accounts only, created via `scripts/seed-users.ts` (interactive password prompt — never pass passwords as CLI args or store them anywhere but the argon2 hash). Auth is `src/lib/server/auth.ts` (hash/verify, session create/validate/destroy) + an `HttpOnly` session cookie read in `src/hooks.server.ts`, which also does the route guard (every route requires a session except `/login`).
- **Frequency behavior is one map.** `src/lib/server/frequency.ts` exports `FREQUENCIES`, keyed by `daily | weekly | monthly | quarterly | biannual | annual | one_off`, each with `{ label, intervalDays, sortRank, colorToken }` (`one_off.intervalDays === null`, meaning "never recurs, inactive forever after one completion"). Adding a frequency is one entry here plus one CSS custom property in `app.css` — no query/component/route changes. Group ordering everywhere is driven by `sortRank`, always ending in a final "Inactive" group.
- **Rooms are data, not code** — seeded via `scripts/seed-rooms.ts`, idempotent upsert. Adding a room is a seed-script edit, not an app change.
- **Assignee is nullable = shared.** `assignee_user_id IS NULL` means "either person." Filtering chores by a person must match `assignee_user_id = :id OR assignee_user_id IS NULL` — never filter by equality alone, or shared chores silently disappear from both people's filtered views.
- **`completions.user_id` is nullable** on purpose — backdated "date last performed" entries made from the add/edit chore form have no performer attached.
- Query chores + their latest completion in one statement (subquery/join); never N+1 per chore in a loop.

## Conventions

- Server-only modules live under `src/lib/server/`; keep `auth.ts` free of SvelteKit imports so `scripts/*.ts` can import it directly with `tsx`.
- Shared types (`Chore`, `ChoreGroup`, `Filters`, etc.) go in `src/lib/types.ts`, not duplicated per-route.
- Filter state lives in URL query params, not component state, so filters survive reload and are shareable.
- Vitest tests run against an in-memory SQLite DB, not the dev `./data/chores.db`.
- Tailwind CSS, mobile-first (this app is used on phones — verify layouts at 375px width).
- `node:22-slim`, not Alpine, in both Docker stages — `better-sqlite3` is a native module and Alpine means musl rebuilds.
- Every `docker-compose.yml` service needs `stop_grace_period: 5s` or `Ctrl+C`/`docker compose down` hangs.

## Secrets

`.env` (gitignored) holds `DATABASE_PATH`, `SESSION_SECRET`, `ORIGIN`, `NODE_ENV` locally; production uses `fly secrets` for `SESSION_SECRET` only and `fly.toml [env]` for the rest. Never commit a password, session secret, or `FLY_API_TOKEN` — passwords only ever exist as argon2 hashes in the DB, set interactively through `scripts/seed-users.ts`.
