# Journal

A single-user personal journal application with mood/energy tracking, tags, full edit history, calendar view, full-text search, PWA install, and push notifications. Deployed at `naplo.csalex.dev`.

---

## Local development

```bash
cp .env.example .env.local   # fill in all values
pnpm install
pnpm db:migrate
pnpm dev                     # http://localhost:3000
```

Run the notification worker in a second terminal:

```bash
pnpm worker:dev
```

Generate VAPID keys (first time only — back these up):

```bash
pnpm vapid:generate
# copy the output into .env.local
```

---

## Production deployment

### Prerequisites on the VPS

- Docker + Docker Compose v2
- Traefik running on the `proxy_network` external network with the `myresolver` cert resolver
- `.env` file at `journal/docker/.env` (copy from `.env.example`, fill all values)

### 1. Cloudflare Access (do this first)

In the Cloudflare Zero Trust dashboard (`one.dash.cloudflare.com`):

1. **Access → Applications → Add an application → Self-hosted**
2. Application name: `Journal`
3. Application domain: `naplo.csalex.dev`
4. Policy name: `Owner only`
5. Rule: **Include → Emails → `csiszaralex@gmail.com`**
6. Save — Cloudflare Access now guards the entire subdomain before any request reaches the app.

> The application also enforces its own passkey auth as a second layer.

### 2. Cloudflare R2 bucket

1. R2 → Create bucket → name: `journal-backup`
2. Manage R2 API tokens → Create API token → **Object Read & Write** scoped to `journal-backup`
3. Copy the **Access Key ID** and **Secret Access Key** into your `.env` as `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`

### 3. Self-hosted GitHub Actions runner (one-time setup on VPS)

The deploy job runs on a self-hosted runner living on the VPS itself — no inbound SSH needed.

```bash
# On the VPS: create a dedicated user and install the runner
useradd -m -s /bin/bash runner
usermod -aG docker runner   # allow Docker access without sudo
su - runner

# Follow the runner registration steps from:
# GitHub repo → Settings → Actions → Runners → New self-hosted runner
# Choose Linux x64, run the shown curl + config commands
# Then install as a service:
sudo ./svc.sh install
sudo ./svc.sh start
```

### 4. GitHub secrets

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `ENV_FILE_PATH` | Absolute path to the `.env` file on the VPS, e.g. `/home/runner/journal.env` |

Copy your `.env` to that path on the VPS once:
```bash
scp .env vps:/home/runner/journal.env
chmod 600 /home/runner/journal.env
```

Also create a **GitHub Environment** named `production` (Settings → Environments).

### 5. First deploy

Push to `main` — the pipeline will:
1. Lint + typecheck + build (GitHub-hosted runner)
2. Build and push image to `ghcr.io` (GitHub-hosted runner)
3. Pull image + `docker compose up -d` (self-hosted runner on VPS)

On the very first run, `docker compose up -d` also starts Litestream automatically.

Run migrations once after first boot:
```bash
# On the VPS
docker compose --env-file /home/runner/journal.env exec web npx drizzle-kit migrate
```

### 6. Verify

- `https://naplo.csalex.dev/api/health` → `{"ok":true}`
- Sign in with your passkey
- Check Litestream is replicating: `docker compose logs litestream`

### CI/CD pipeline

On every push to `main`:
1. **ci** — lint, typecheck, `next build` (GitHub-hosted)
2. **docker** — build + push to `ghcr.io/csiszaralex/journal:latest` with registry cache (GitHub-hosted)
3. **deploy** — `docker compose pull && up -d` + image prune (self-hosted runner on VPS)

---

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite path, e.g. `file:/data/journal.db` |
| `AUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `AUTH_URL` | Full URL, e.g. `https://naplo.csalex.dev` |
| `ALLOWED_EMAIL` | Your email — only account allowed to sign in |
| `VAPID_PUBLIC_KEY` | From `pnpm vapid:generate` |
| `VAPID_PRIVATE_KEY` | From `pnpm vapid:generate` — keep secret |
| `VAPID_SUBJECT` | `mailto:your@email.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same value as `VAPID_PUBLIC_KEY` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |

---

## Backup & restore

**Continuous backup** runs via Litestream, replicating `journal.db` to R2 bucket `journal-backup` in real time.

### Restore drill (run monthly)

```bash
# 1. Download a snapshot from R2
docker run --rm \
  -e LITESTREAM_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID \
  -e LITESTREAM_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY \
  -v /tmp:/tmp \
  litestream/litestream restore \
  -o /tmp/restored.db \
  s3://journal-backup/journal

# 2. Verify row counts match production
sqlite3 /tmp/restored.db "SELECT COUNT(*) FROM entries; SELECT COUNT(*) FROM entry_versions;"
sqlite3 /data/journal.db  "SELECT COUNT(*) FROM entries; SELECT COUNT(*) FROM entry_versions;"

# 3. If counts match — drill passed. If not — treat as production incident.
```

> **Rule**: untested backup = no backup. If the drill fails, investigate before the next deploy.

**Secondary backup**: use the in-app JSON export (Settings → Export JSON) and store in your password manager or encrypted drive.

---

## Architecture notes

- **Auth**: Cloudflare Access (layer 1) → passkey/WebAuthn via Auth.js v5 (layer 2) → session cookie (90 days, httpOnly, secure)
- **Database**: SQLite via Drizzle ORM + better-sqlite3. WAL mode. FTS5 for full-text search.
- **Soft delete only**: no `DELETE` statements on user content — `deleted_at` timestamps.
- **Edit history**: every save creates a new `entry_versions` row; rollback = updating `current_version_id`.
- **Push notifications**: `web-push` + VAPID. Worker process (`node-cron`, every minute) checks each device's local time and sends a reminder if no entry written that day.
- **PWA**: Serwist service worker with precaching and runtime caching. Install from browser for push support on iOS.
