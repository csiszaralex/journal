# Journal

A single-user personal journal app with Markdown entries, mood/energy tracking, normalized tags, full per-version edit history, calendar view, FTS5 full-text search, stats charts, entry templates, JSON/Markdown export, PWA install with offline write queue, and per-device push notification reminders. Deployed at `naplo.csalex.dev`.

Stack: Next.js 16 (App Router, Webpack) · React 19 · TypeScript · Drizzle ORM + better-sqlite3 (WAL + FTS5) · Auth.js v5 with the passkey/WebAuthn provider · Tailwind v4 + shadcn/ui (Base UI) · Serwist (PWA + BackgroundSync) · web-push + node-cron (separate worker process) · Litestream → Cloudflare R2.

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

Useful scripts: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm db:studio`, `pnpm db:push`.

---

## Features

- **Entries** — Markdown text, optional 1–5 mood and energy, optional tags. Past or future `entry_date` allowed; multiple entries per day. Templates can pre-fill text/mood/energy.
- **Edit history** — every save writes a new `entry_versions` row and updates `entries.current_version_id`. Old versions stay queryable; "rollback" is a pointer update.
- **Soft delete** — no `DELETE` statements on user content; `deleted_at` timestamps only.
- **Calendar** — month grid with per-day indicators; click a day to view/create entries for that date.
- **Search** — SQLite FTS5 over current-version entry text and tag display names.
- **Stats** — 90-day mood/energy charts, totals, and a consistency percentage (`getOverallStats` / `getDailyStats`).
- **Tags** — normalized dictionary, lowercase unique names, denormalized `usage_count` for autocomplete ordering. Tags are versioned (per `entry_versions` row).
- **Export** — JSON (full dump incl. version history) and Markdown (current versions with YAML frontmatter). Each export is logged in `audit_log`.
- **Auth** — Cloudflare Access (perimeter) → Auth.js v5 passkey/WebAuthn (in-app) → database session, 90-day cookie (httpOnly, secure in prod, sameSite=lax). Only `ALLOWED_EMAIL` may sign in. New passkey registrations are gated by an in-app "Registration" toggle in Settings — disable it after your initial setup. There is **no** email magic-link fallback.
- **Sessions & passkeys** — `/settings/sessions` lists active sessions and registered authenticators with friendly device names derived from the user-agent at creation time; rename or revoke from there.
- **Inactivity timeout** — 30 minutes of no user input triggers a 60-second warning, then automatic sign-out (`InactivityTimer`).
- **PWA** — Serwist service worker with precache, runtime caching, and a `~/offline` fallback for navigations. Install from the browser to enable push on iOS ≥ 16.4.
- **Offline writes** — `POST /api/sync` is the single mutation endpoint used by the client. The service worker uses Serwist's `BackgroundSyncQueue` to retry failed POSTs; the app shell also `postMessage`s a `flush-pending` signal when `online` fires, for browsers without Background Sync. Idempotency via a client-generated `client_id` (unique on `entry_versions`).
- **Push notifications** — per-device timezone and reminder time. The worker process (`* * * * *`) checks every enabled subscription each minute, and if the device's local clock matches `notify_hour:notify_minute` and no entry exists for the local day, sends a deterministic prompt picked from [data/prompts.json](data/prompts.json). Duplicate sends are blocked by `notifications_sent(subscription_id, date)`. `410 Gone` responses disable the subscription.
- **Keyboard shortcuts** — `?` opens the reference; `h`/`c`/`s`/`t` jump to Today/Calendar/Search/Stats (disabled while typing).
- **Theme** — dark/light toggle via `next-themes`, persisted to localStorage.
- **Audit log** — `audit_log` table records sign-in, sign-out, register, entry create/update/delete, push subscription changes, and exports.

---

## Environment variables

Used and validated in [src/env.ts](src/env.ts) (server-only — there are no `NEXT_PUBLIC_*` vars; the VAPID public key is passed to the client via server props).

| Variable               | Required                              | Description                                                                    |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`         | no (default `file:./data/journal.db`) | SQLite path. In Docker the deploy workflow sets it to `file:/data/journal.db`. |
| `AUTH_SECRET`          | yes                                   | Auth.js session secret — `openssl rand -base64 32`.                            |
| `AUTH_URL`             | prod                                  | Full origin, e.g. `https://naplo.csalex.dev`.                                  |
| `ALLOWED_EMAIL`        | yes                                   | The single email allowed to sign in.                                           |
| `VAPID_PUBLIC_KEY`     | yes                                   | From `pnpm vapid:generate`.                                                    |
| `VAPID_PRIVATE_KEY`    | yes                                   | From `pnpm vapid:generate` — secret.                                           |
| `VAPID_SUBJECT`        | yes                                   | `mailto:your@email.com`.                                                       |
| `R2_ACCESS_KEY_ID`     | prod                                  | Cloudflare R2 access key — consumed by Litestream via `litestream.yml`.        |
| `R2_SECRET_ACCESS_KEY` | prod                                  | Cloudflare R2 secret key.                                                      |
| `SKIP_ENV_VALIDATION`  | optional                              | Set to `1` during builds (the Dockerfile and CI both do).                      |

---

## Architecture notes

- **App layout guard** — `src/app/(app)/layout.tsx` is the auth boundary. It calls `auth()` and redirects unauthenticated requests to `/sign-in`. There is no `proxy.ts` / middleware.
- **Mutations** — Server Actions for in-app forms; `POST /api/sync` is the single JSON endpoint used by the service worker for offline replay. Both share Zod schemas from `src/lib/validation.ts`.
- **DB client** — `better-sqlite3` with `journal_mode = WAL` and `foreign_keys = ON`. Drizzle migrations run on each process start (web and worker).
- **Worker** — `src/worker/index.ts` is bundled at image-build time by esbuild into a single CJS file at `dist/worker/index.js`, run by the separate `worker` compose service. It only depends on `src/db/`, `src/lib/`, and `src/env.ts` — never on `src/app/`.
- **PWA service worker** — `src/app/sw.ts`. Precaches the build, uses Serwist's `defaultCache` for runtime GETs, intercepts `POST /api/sync`, and handles `push` / `notificationclick` events.

---

## Production deployment

The production target is a VPS running Traefik on an external `proxy_network` Docker network with a cert resolver named `myresolver`. Container images are published to `ghcr.io/<owner>/journal`. Deploys are pulled and applied by a GitHub Actions self-hosted runner that lives on the VPS — no inbound SSH needed.

### Prerequisites on the VPS

- Docker + Docker Compose v2
- An external Docker network named `proxy_network` with a Traefik instance attached, using cert resolver `myresolver`
- A self-hosted GitHub Actions runner registered to this repo (see step 3)

### 1. Cloudflare Access (perimeter auth)

In the Zero Trust dashboard (`one.dash.cloudflare.com`):

1. **Access → Applications → Add an application → Self-hosted**
2. Application name: `Journal`; domain: `naplo.csalex.dev`
3. Policy `Owner only` — **Include → Emails → `csiszaralex@gmail.com`**
4. Save. Cloudflare Access now gates the subdomain before any request reaches Traefik. The app's passkey auth is the second layer.

### 2. Cloudflare R2 bucket (for Litestream backups)

1. R2 → Create bucket → name: `journal-backup`
2. R2 → Manage API tokens → Create API token, **Object Read & Write** scoped to `journal-backup`
3. The R2 endpoint is pinned in [docker/litestream.yml](docker/litestream.yml). Change it if your R2 account ID differs.

### 3. Self-hosted GitHub Actions runner (one-time)

```bash
# On the VPS
useradd -m -s /bin/bash runner
usermod -aG docker runner
su - runner

# Follow GitHub repo → Settings → Actions → Runners → New self-hosted runner (Linux x64)
# Then install as a service:
sudo ./svc.sh install
sudo ./svc.sh start
```

### 4. GitHub secrets, variables, and environment

Create a GitHub **Environment** named `production` (Settings → Environments). The `deploy` job is bound to it.

The CI workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml)) writes `.env` on every deploy from these GitHub Actions inputs:

**Repository secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret                 | Used for                     |
| ---------------------- | ---------------------------- |
| `AUTH_SECRET`          | Auth.js session secret       |
| `ALLOWED_EMAIL`        | Single allowed sign-in email |
| `VAPID_PRIVATE_KEY`    | Push notification signing    |
| `R2_SECRET_ACCESS_KEY` | Litestream → R2              |

**Repository variables** (same page → Variables):

| Variable           | Used for                                       |
| ------------------ | ---------------------------------------------- |
| `AUTH_URL`         | `https://naplo.csalex.dev`                     |
| `VAPID_PUBLIC_KEY` | Push public key (also forwarded to the client) |
| `VAPID_SUBJECT`    | `mailto:you@example.com`                       |
| `R2_ACCESS_KEY_ID` | Litestream → R2                                |

`DATABASE_URL` is hardcoded by the workflow to `file:/data/journal.db`.

### 5. First deploy

Push to `main`. The pipeline runs three jobs (see CI/CD pipeline below). On first boot the web container creates the `journal_data` named volume, applies all Drizzle migrations automatically, and the `litestream` service starts replicating to R2.

### 6. Verify

- `https://naplo.csalex.dev/api/health` → `{"ok":true}`
- Sign in with your passkey (Settings → Registration must be on for the first passkey enrollment; turn it off afterwards)
- `docker compose -f docker/docker-compose.yml logs litestream` shows ongoing replication
- `docker compose -f docker/docker-compose.yml logs worker` shows a `worker.boot` log line and a `tick.idle` line each minute when no notifications are due

---

## CI/CD pipeline

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push and PR to `main`:

1. **ci** (GitHub-hosted, `ubuntu-latest`) — `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build` (with `SKIP_ENV_VALIDATION=1`). Runs on pushes and PRs.
2. **docker** (GitHub-hosted, push to `main` only) — builds [docker/Dockerfile](docker/Dockerfile) with Buildx and pushes `ghcr.io/<owner>/journal:latest` plus a `sha-<commit>` tag. Uses a `:buildcache` registry cache.
3. **deploy** (self-hosted, push to `main` only, `environment: production`) — writes `.env` from secrets+variables, fixes the data volume's ownership to `1000:1000` (so the unprivileged `node` and `litestream` users can write), then in `docker/`:
   ```bash
   docker compose pull web worker
   docker compose up -d --remove-orphans --force-recreate
   docker image prune -f
   ```

[.github/dependabot.yml](.github/dependabot.yml) opens weekly grouped PRs for npm (dev / prod groups) and GitHub Actions updates.

---

## Docker layout

- [docker/Dockerfile](docker/Dockerfile) — three stages on `node:24-alpine`. `deps` installs with `node-linker=hoisted` so `better-sqlite3` native bindings resolve at a flat path. `builder` runs `pnpm build` (Next.js standalone output) and bundles the worker with esbuild into `dist/worker/index.js`, externalizing only `better-sqlite3`. `runner` copies the standalone output, worker bundle, `drizzle/` migrations, and the three native-module trees; runs as the `node` user; exposes 3000.
- [docker/docker-compose.yml](docker/docker-compose.yml) — three services sharing the `journal_data` named volume:
  - `web` — the Next.js server, attached to `proxy_network` with Traefik labels for `naplo.csalex.dev`. Health check hits `/api/health`.
  - `worker` — same image, overridden `command: node dist/worker/index.js`. Runs the cron loop.
  - `litestream` — `litestream/litestream:latest` as uid 1000, replicating per [docker/litestream.yml](docker/litestream.yml).

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
docker compose -f docker/docker-compose.yml exec web \
  sqlite3 /data/journal.db "SELECT COUNT(*) FROM entries; SELECT COUNT(*) FROM entry_versions;"
```

If counts diverge, treat it as a production incident — untested backup = no backup.

**Secondary backup**: in-app JSON export from Settings → _Export data_ → _Download JSON_. Store in a password manager or encrypted drive.

---

## Project layout

```
src/
├── app/
│   ├── (app)/            # Authenticated routes (layout.tsx is the auth guard)
│   │   ├── page.tsx                Today
│   │   ├── calendar/page.tsx
│   │   ├── entry/[id]/page.tsx
│   │   ├── entry/[id]/history/page.tsx
│   │   ├── search/page.tsx
│   │   ├── stats/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── sessions/page.tsx
│   │       └── devices/page.tsx
│   ├── (auth)/sign-in/   # Passkey sign-in
│   ├── api/
│   │   ├── auth/[...nextauth]/     Auth.js handler
│   │   ├── health/                 Liveness for Docker healthcheck
│   │   ├── sync/                   Offline-replay mutation endpoint
│   │   └── push/{subscribe,unsubscribe}/
│   ├── ~offline/         PWA fallback
│   └── sw.ts             Service worker (Serwist)
├── actions/              Server Actions
├── components/{ui,journal}/
├── db/{schema.ts,client.ts,queries/}
├── lib/{auth,push,validation,entry-utils,user-agent,offline,utils}.ts
├── worker/index.ts       node-cron entry point, bundled by esbuild for prod
└── env.ts
drizzle/                  Generated migrations + hand-written FTS5 setup (0001_fts5_setup.sql)
data/prompts.json         Rotating notification prompts
docker/{Dockerfile,docker-compose.yml,litestream.yml}
.github/{workflows/ci.yml,dependabot.yml}
```

