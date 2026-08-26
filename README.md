# Journal

A single-user personal journal app: daily entries with mood/energy tracking, tags and ordered emotions, AI-generated reflective questions (Anthropic), period summaries after long gaps, intentions (to-dos with categories), full per-version edit history, calendar view, FTS5 full-text search, stats charts, entry templates, JSON/Markdown export, PWA install with offline write queue, per-device push notification reminders, and an in-app audit log. Deployed at `naplo.csalex.dev`.

Stack: Next.js 16 (App Router, Webpack) · React 19 · TypeScript · Drizzle ORM + better-sqlite3 (WAL + FTS5) · Auth.js v5 with the passkey/WebAuthn provider · Tailwind v4 + shadcn/ui (Base UI) · Serwist (PWA + BackgroundSync) · web-push + node-cron (separate worker process) · Anthropic SDK · Litestream → Cloudflare R2.

---

## Local development

```bash
cp .env.example .env.local   # fill in all values (see Environment variables)
pnpm install
pnpm dev                     # http://localhost:3000
```

Migrations run automatically at app boot from [src/db/client.ts](src/db/client.ts#L19) against the files in [drizzle/](drizzle/). If you change the schema, use `pnpm db:generate` to create a new migration; the next boot picks it up.

The notification scheduler is a separate process. Run it in a second terminal:

```bash
pnpm worker:dev
```

Generate VAPID keys once (back them up — losing them invalidates every push subscription):

```bash
pnpm vapid:generate
# copy the output into .env.local
```

Useful scripts: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm db:studio`, `pnpm db:push`. Run `pnpm lint` before `pnpm typecheck` (typecheck generates route types first).

---

## Features

- **Entries** — plain-text body (up to 100k chars; Markdown is _not_ rendered yet), optional 1–5 mood and energy, tags, ordered emotions (with optional emoji), and saved AI Q&A pairs. Any `entry_date` (past or future) is allowed; **one daily entry per date** — a duplicate create is converted into an update on the sync endpoint. Templates can pre-fill text/mood/energy when those fields are empty. New-entry drafts autosave to `localStorage` per date.
- **Summary entries** — `kind = 'summary'` with a `period_start … entry_date` range, written by the user after a gap. Excluded from streak, gap detection, stats, and calendar mood colouring; shown in search, the calendar panel (amber band on covered days), and AI history. The home page offers one via a gap banner when the last daily entry is ≥ `summary_gap_days` (Settings, 3–60, default 7) days old.
- **AI (Anthropic `claude-sonnet-4-6`)** — three manual, non-streaming, tool-forced endpoints under `/api/ai/`: `questions` (reflective questions from the last N non-empty entries — `ai_history_days`, 1–14, default 3 — the current draft, the profile, and, in summary mode, the period's intentions), `emotions` (up to 3 emotion suggestions from the draft), and `profile-questions` (interview questions for the profile). Each has an in-process 5 s per-user rate limit and is logged to `audit_log` with token counts only — prompts and responses are not stored. Only answered questions are persisted (`entry_qa_pairs`).
- **Profile** — `/settings/profile`: a free-text bio and an AI-generated Q&A list; answered items are injected into the questions prompt as known facts.
- **Intentions** — `/intentions`: short to-dos with an optional due date and a `Category:` prefix parsed from the text; statuses `open` / `done` / `dropped`; the home page lists open ones due today or earlier; the daily push appends `(N nyitott szándék mára)`. Category colours are hashed from the name and can be overridden in `/settings/categories`. Intentions are **hard-deleted** (no soft delete) and have no link to entries.
- **Edit history** — every save writes a new `entry_versions` row and updates `entries.current_version_id`. Old versions stay queryable; "rollback" is a pointer update.
- **Soft delete** — no `DELETE` statements on entries; `deleted_at` timestamps only. There is no restore UI.
- **Calendar** — month grid (Monday first, swipe to change month on touch) with mood-tinted days, the first emotion's emoji plus up to 3 emotion colour dots, and an amber band for summary-covered days; click a day to open/create that date's entry.
- **Search** — SQLite FTS5 over current-version entry text and tag display names (FTS5 syntax supported, 25 results, no paging). With an empty query the page is a paged list (25/page) filterable by date range and mood; those filters do not apply while a text query is present.
- **Stats** — totals, current/best streak, 30-day mood/energy averages, consistency percentage, 90-day mood/energy line charts (`getOverallStats` / `getDailyStats`). Daily entries only.
- **Tags & emotions** — two normalized dictionaries (lowercase unique `name`, free `display_name`, colour; emotions also have `emoji` and a per-entry position). Both are versioned per `entry_versions` row. Suggestion order is by live usage (non-deleted entries whose current version links the item); there is no stored counter — it is computed live. Admin page at `/settings/tags` (rename, recolour, delete; no merge).
- **Export** — JSON (full dump incl. version history, soft-deleted entries, and the audit log; profile, intentions, templates and Q&A pairs are currently not included) and Markdown (current versions with YAML frontmatter). Each export is logged in `audit_log`. No import.
- **Auth** — Cloudflare Access (perimeter) → Auth.js v5 passkey/WebAuthn (in-app) → database session, **7-day** cookie (httpOnly, secure in prod, sameSite=lax). Only `ALLOWED_EMAIL` may sign in. New passkey registrations from the sign-in page are gated by an in-app "Registration" toggle in Settings (default **on** — disable it after your initial setup). There is **no** email magic-link fallback.
- **Sessions & passkeys** — `/settings/sessions` lists active sessions and registered authenticators with friendly device names derived from the user-agent at creation time; rename or revoke from there. The last passkey and the current session cannot be removed.
- **Inactivity timeout** — 30 minutes of no user input triggers a 60-second warning, then automatic sign-out (`InactivityTimer`).
- **PWA** — Serwist service worker (production builds only) with precache, runtime caching, and a `~/offline` fallback for navigations. Install from the browser to enable push on iOS ≥ 16.4.
- **Offline writes** — `POST /api/sync` is the single mutation endpoint used by the client for entries. The service worker uses Serwist's `BackgroundSyncQueue` (24 h retention) to retry failed POSTs; the app shell also `postMessage`s a `flush-pending` signal when `online` fires and keeps a `localStorage` fallback queue. Idempotency via a client-generated `client_id` (unique on `entry_versions`). Only entry writes are queued; other mutations fail offline.
- **Push notifications** — per-device timezone (12 presets), reminder hour and quarter-hour minute (default 21:00). The worker process (`* * * * *`) checks every enabled subscription each minute, and if the device's local clock matches `notify_hour:notify_minute` exactly and no daily entry exists for the local day, sends a deterministic prompt picked from [data/prompts.json](data/prompts.json) (45 English prompts). Duplicate sends are blocked by `notifications_sent(subscription_id, date)`. `404`/`410` responses disable the subscription. Clicking the notification (or saving that day's entry) sends a `close` push so it is dismissed on every device. Test and "preview today's prompt" buttons live on `/settings/devices`.
- **Keyboard shortcuts** — `?` opens the reference; `h`/`c`/`s`/`t`/`d`/`p` jump to Today/Calendar/Search/Stats/Devices/Settings (disabled while typing); `Ctrl/⌘+Enter` submits the entry form.
- **Theme** — dark (default) / light toggle via `next-themes`, persisted to localStorage; system preference is not followed.
- **Audit log** — `audit_log` records auth (login/logout/register, passkey and session changes), entry create/update/delete/rollback, tag/emotion/template/profile/intention/settings changes, push subscription events, exports, and AI calls. Browsable with search and category filter at `/settings/audit-log`.

UI language is currently mixed (core screens in English, newer features in Hungarian); i18n is tracked as an issue.

---

## Environment variables

Used and validated in [src/env.ts](src/env.ts) (server-only — there are no `NEXT_PUBLIC_*` vars; the VAPID public key is passed to the client via server props).

| Variable               | Required                              | Description                                                                    |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`         | no (default `file:./data/journal.db`) | SQLite path. In Docker it is `file:/data/journal.db`.                          |
| `AUTH_SECRET`          | yes                                   | Auth.js session secret — `openssl rand -base64 32`.                            |
| `AUTH_URL`             | prod                                  | Full origin, e.g. `https://naplo.csalex.dev`.                                  |
| `ALLOWED_EMAIL`        | yes                                   | The single email allowed to sign in.                                           |
| `VAPID_PUBLIC_KEY`     | yes                                   | From `pnpm vapid:generate`.                                                    |
| `VAPID_PRIVATE_KEY`    | yes                                   | From `pnpm vapid:generate` — secret.                                           |
| `VAPID_SUBJECT`        | yes                                   | `mailto:your@email.com`.                                                       |
| `ANTHROPIC_API_KEY`    | yes                                   | Anthropic API key for the `/api/ai/*` endpoints.                               |
| `R2_ACCESS_KEY_ID`     | prod                                  | Cloudflare R2 access key — consumed by Litestream (config in the infra repo).  |
| `R2_SECRET_ACCESS_KEY` | prod                                  | Cloudflare R2 secret key.                                                      |
| `SKIP_ENV_VALIDATION`  | optional                              | Set to `1` during builds (the Dockerfile and CI both do).                      |

---

## Architecture notes

- **App layout guard** — `src/app/(app)/layout.tsx` is the auth boundary. It calls `auth()` and redirects unauthenticated requests to `/sign-in`. There is no `proxy.ts` / middleware.
- **Mutations** — Server Actions (via `next-safe-action`'s `authActionClient`) for in-app forms; `POST /api/sync` is the single JSON endpoint used by the entry form and the service worker for offline replay. Both share Zod schemas from `src/lib/validation.ts`.
- **AI** — `src/lib/ai/anthropic.ts` holds the client and model constant; the three route handlers under `src/app/api/ai/` build prompts, force a tool call, validate the tool input with Zod, and log to `audit_log`.
- **DB client** — `better-sqlite3` with `journal_mode = WAL` and `foreign_keys = ON`. Drizzle migrations run on each process start (web and worker). FTS5 tables and triggers are hand-written in `drizzle/0001_fts5_setup.sql`.
- **Time zones** — `src/lib/date.ts` defines `APP_TZ = Europe/Budapest`, used by intentions, the worker, and AI dates; the home/calendar pages use server-local time and stats use UTC. Tracked as an issue.
- **Worker** — `src/worker/index.ts` is bundled at image-build time by esbuild into a single CJS file at `dist/worker/index.js` and run as a separate container. It only depends on `src/db/`, `src/lib/`, and `src/env.ts` — never on `src/app/`.
- **PWA service worker** — `src/app/sw.ts`. Precaches the build, uses Serwist's `defaultCache` for runtime GETs, intercepts `POST /api/sync`, and handles `push` / `notificationclick` events (including the `close` push type).

---

## Deployment

Production runs as Docker containers (web, worker, Litestream) on a VPS behind Traefik and Cloudflare Access. Since commit `83db7fe` the compose file, `litestream.yml`, and the deploy job live in the central infra repository — this repo only builds and publishes the image.

What stays here:

- **Cloudflare Access** (perimeter auth) — a self-hosted application for `naplo.csalex.dev` with an "Owner only" policy including the single allowed email. The app's passkey auth is the second layer.
- **Cloudflare R2** — bucket `journal-backup` with an Object Read & Write API token, used by Litestream (configured in the infra repo).
- **First sign-in** — Settings → Registration must be on for the first passkey enrollment; turn it off afterwards.
- **Health check** — `GET /api/health` → `{"ok":true}`.

---

## CI/CD pipeline

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push and PR to `main`:

1. **ci** (`ubuntu-latest`) — `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build` (with `SKIP_ENV_VALIDATION=1`).
2. **docker** (push to `main` only) — builds [docker/Dockerfile](docker/Dockerfile) with Buildx and pushes `ghcr.io/<owner>/journal:latest` plus a `sha-<commit>` tag. Uses a `:buildcache` registry cache.

Deployment of the published image is handled by the infra repo. [.github/dependabot.yml](.github/dependabot.yml) opens weekly grouped PRs for npm (dev / prod groups) and GitHub Actions updates.

---

## Docker image

[docker/Dockerfile](docker/Dockerfile) — three stages on `node:24-alpine`. `deps` installs with `node-linker=hoisted` so `better-sqlite3` native bindings resolve at a flat path. `builder` runs `pnpm build` (Next.js standalone output) and bundles the worker with esbuild into `dist/worker/index.js`, externalizing only `better-sqlite3`. `runner` copies the standalone output, worker bundle, `drizzle/` migrations, and the native-module trees; runs as the `node` user; exposes 3000. The same image serves both the web (`next start`) and worker (`node dist/worker/index.js`) containers.

---

## Backup & restore

Continuous backup is via Litestream replicating `/data/journal.db` to the `journal-backup` R2 bucket under path `journal`.

### Restore drill (run monthly)

```bash
# 1. Download the latest snapshot from R2
docker run --rm \
  -e LITESTREAM_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID \
  -e LITESTREAM_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY \
  -v /tmp:/tmp \
  litestream/litestream restore \
  -o /tmp/restored.db \
  s3://journal-backup/journal

# 2. Verify row counts match production
sqlite3 /tmp/restored.db "SELECT COUNT(*) FROM entries; SELECT COUNT(*) FROM entry_versions;"
# compare with the same query against /data/journal.db inside the running web container
```

If counts diverge, treat it as a production incident — untested backup = no backup.

**Secondary backup**: in-app JSON export from Settings → _Export data_ → _Export JSON_. Store in a password manager or encrypted drive. Also back up the VAPID keys.

---

## Project layout

```
src/
├── app/
│   ├── (app)/            # Authenticated routes (layout.tsx is the auth guard)
│   │   ├── page.tsx                Today (single-day view + gap banner + today's intentions)
│   │   ├── calendar/page.tsx
│   │   ├── entry/[id]/page.tsx
│   │   ├── entry/[id]/history/page.tsx
│   │   ├── intentions/page.tsx
│   │   ├── search/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── summary/new/page.tsx    Summary entry for a period
│   │   └── settings/
│   │       ├── page.tsx            Theme, templates, AI settings, registration, export
│   │       ├── audit-log/page.tsx
│   │       ├── categories/page.tsx Intention category colours
│   │       ├── devices/page.tsx    Push subscriptions
│   │       ├── profile/page.tsx    Bio + AI profile Q&A
│   │       ├── sessions/page.tsx   Sessions & passkeys
│   │       └── tags/page.tsx       Tags & emotions admin
│   ├── (auth)/sign-in/   # Passkey sign-in
│   ├── api/
│   │   ├── ai/{questions,emotions,profile-questions}/   Anthropic-backed endpoints
│   │   ├── auth/[...nextauth]/     Auth.js handler
│   │   ├── health/                 Liveness for Docker healthcheck
│   │   ├── sync/                   Offline-replay mutation endpoint
│   │   └── push/{subscribe,unsubscribe,dismiss}/
│   ├── ~offline/         PWA fallback
│   └── sw.ts             Service worker (Serwist)
├── actions/              Server Actions (entries, intentions, tags, emotions, templates, profile, settings, …)
├── components/{ui,journal,settings,profile}/
├── db/{schema.ts,client.ts,queries/}
├── lib/{auth,push,validation,entry-utils,intentions,color,date,text,summary-config,offline,user-agent,safe-action,utils}.ts
├── lib/ai/{anthropic,history-config}.ts
├── worker/index.ts       node-cron entry point, bundled by esbuild for prod
└── env.ts
drizzle/                  Generated migrations + hand-written FTS5 setup (0001_fts5_setup.sql)
data/prompts.json         Rotating notification prompts
docker/Dockerfile
.github/{workflows/ci.yml,dependabot.yml}
task.md                   Original build specification (historical; the app has since grown past it)
```
