# Journal — Project Build Specification for Claude Code

> **To Claude Code**: This document describes a personal journal application to be built in the current empty directory. Read this entire document before starting. Follow the phases in order. **Check in with the user between each phase** — do not steamroll through all of it in one go.

## 0. Absolute Rules (read first, violate none)

1. **Package manager is pnpm.** Never run `npm` or `yarn`. If pnpm is not installed, stop and ask the user to install it (`npm install -g pnpm` or via corepack).
2. **Never hand-edit `package.json` dependencies.** Add/remove packages exclusively via `pnpm add`, `pnpm add -D`, `pnpm remove`, `pnpm update`. The `scripts`, `name`, `version`, `packageManager`, `engines`, `type` fields may be edited manually. The `dependencies` and `devDependencies` blocks are off-limits to manual edits.
3. **Language is English.** All code, comments, variable names, UI strings, commit messages, and DB column names must be in English. No Hungarian anywhere in the codebase.
4. **Check in with the user after every phase.** Do not proceed to the next phase without confirmation. Show what you built, note any deviations from this spec, and ask before moving on.
5. **No placeholder secrets in committed files.** Use `.env.example` with empty or obviously fake values; the real `.env` goes in `.gitignore`.
6. **Soft delete only.** Never issue a `DELETE` statement on user content. Use `deleted_at` timestamps.
7. **Every destructive or long operation must be shown to the user first.** Migrations, schema changes, bulk edits — show the plan, get confirmation, execute.

---

## 1. Product Overview

**Journal** is a single-user personal journal application. The user is the sole owner of the instance. It will be deployed to `naplo.csalex.dev` behind Cloudflare Access and Traefik (which already handle TLS for `*.csalex.dev`).

> Project name is `journal`. Subdomain remains `naplo.csalex.dev` per the user's earlier explicit choice. If the user later wants to change the subdomain, they will say so.

### Core features

- Daily entries with free-form Markdown text
- 1–5 scale for mood and energy (both optional)
- Multi-select tags (dominant feelings, e.g. "calm", "anxious", "grateful") stored in a normalized schema with autocomplete suggestions from past tags; ad-hoc new tags can be created inline
- Multiple entries per day allowed
- **Backdating and forward-dating**: an entry's `entry_date` can be any date (past, present, or future)
- **Full edit history**: every save creates a new version; the entry identity is separate from its content so there is no duplication between "current" and "historical" state
- **Soft delete**: entries can be "deleted" but are recoverable
- Calendar view (month) with indicators on days that have entries
- List view with filters (date range, tags, mood range)
- Full-text search (SQLite FTS5) over entry text **and** tag names
- JSON + Markdown export
- PWA installable on phone/tablet/desktop
- Web Push notifications per device: "you haven't written today" reminder at a device-configured local time
- Rotating prompt bank for notifications (~40-50 questions) so reminders don't become stale

### Non-functional requirements

- Mobile-first responsive UI
- Defense-in-depth auth: Cloudflare Access → application-level passkey (WebAuthn) auth → secure session cookies
- Continuous SQLite backup via Litestream to Cloudflare R2
- Single-tenant: no sign-up flow, no user management UI. The one user is provisioned manually.

---

## 2. Technology Stack (fixed — do not substitute)

| Layer              | Choice                                                | Notes                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager    | **pnpm**                                              | Pinned via `packageManager` field                                                                                                                                                                             |
| Runtime            | **Node.js 24 LTS (Krypton)**                          | `.nvmrc` contains `24`. Node 24 has stable native TypeScript support; we still use full TS toolchain for type checking.                                                                                       |
| Framework          | **Next.js 16** App Router                             | Turbopack is default. `proxy.ts` is the new name for middleware; we don't need one (see Section 5, Phase 3 note).                                                                                             |
| Language           | **TypeScript**                                        | Strict mode                                                                                                                                                                                                   |
| ORM                | **Drizzle + Drizzle Kit**                             | Not Prisma                                                                                                                                                                                                    |
| Database           | **SQLite** via `better-sqlite3`                       | File at `./data/journal.db` in dev, `/data/journal.db` in prod                                                                                                                                                |
| Full-text search   | **SQLite FTS5**                                       | Virtual table synced via triggers; indexes entry text + tag names                                                                                                                                             |
| UI components      | **shadcn/ui with Base UI** via preset                 | Installed with a specific preset command (see Phase 4) that includes Base UI primitives, color scale, and lucide-react                                                                                        |
| Styling            | **Tailwind CSS v4**                                   | Delivered by create-next-app                                                                                                                                                                                  |
| Icons              | **lucide-react**                                      | Installed as part of the shadcn preset; no separate install needed                                                                                                                                            |
| Dates              | **date-fns** + **date-fns-tz**                        |                                                                                                                                                                                                               |
| Forms              | **Conform** (`@conform-to/react` + `@conform-to/zod`) | Server-Action-native, shares Zod schemas between client and server, works with `useActionState`, progressive enhancement. **Not react-hook-form** — we don't want the impedance mismatch with Server Actions. |
| Validation         | **Zod**                                               | At every input boundary; shared between Conform (client) and Server Actions (server)                                                                                                                          |
| Auth               | **Auth.js v5 (NextAuth beta)** + passkey provider     | Email magic link as fallback                                                                                                                                                                                  |
| PWA                | **Serwist**                                           | Not `next-pwa` (unmaintained)                                                                                                                                                                                 |
| Push               | **web-push**                                          | VAPID keys                                                                                                                                                                                                    |
| Scheduler          | **node-cron**                                         | Runs as a second process from the same codebase                                                                                                                                                               |
| Env validation     | **@t3-oss/env-nextjs** + zod                          |                                                                                                                                                                                                               |
| ID generation      | **@paralleldrive/cuid2**                              |                                                                                                                                                                                                               |
| Markdown rendering | **react-markdown** + **remark-gfm**                   |                                                                                                                                                                                                               |

**Version discovery**: Claude Code should check the actual latest versions at install time via `pnpm dlx <tool>@latest --help` or the package registry. Pin major versions via `pnpm add`'s default caret behavior. The spec fixes the **tools**, not the exact minor versions.

---

## 3. Project Structure

The project is bootstrapped by `create-next-app` (see Phase 1), which generates most of the skeleton. Beyond that, add only these files as needed per phase:

```
journal/
├── .github/
│   └── workflows/
│       └── ci.yml
├── data/
│   └── prompts.json              # Rotating notification prompts
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── litestream.yml
├── drizzle/                      # Generated migrations — never hand-edit
├── public/
│   ├── icons/                    # PWA icons (placeholders initially)
│   └── manifest.webmanifest
├── src/
│   ├── app/                      # Created by create-next-app
│   │   ├── (auth)/
│   │   │   └── sign-in/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx        # Auth guard here (Server Component)
│   │   │   ├── page.tsx          # "Today" view
│   │   │   ├── calendar/page.tsx
│   │   │   ├── entry/[id]/page.tsx
│   │   │   ├── entry/[id]/history/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── devices/page.tsx  # Push subscription management
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── health/route.ts
│   │   │   └── push/
│   │   │       ├── subscribe/route.ts
│   │   │       └── unsubscribe/route.ts
│   │   ├── layout.tsx            # Generated, then edited
│   │   ├── globals.css           # Generated
│   │   └── sw.ts                 # Service worker entry (Serwist)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui generated components (Base UI)
│   │   └── journal/              # Domain components
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   └── queries/
│   │       ├── entries.ts
│   │       ├── tags.ts
│   │       └── subscriptions.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── push.ts
│   │   ├── timezone.ts
│   │   └── validation.ts         # Shared Zod schemas
│   ├── actions/                  # Server Actions
│   │   ├── entries.ts
│   │   └── subscriptions.ts
│   ├── worker/
│   │   └── index.ts              # node-cron entry point
│   └── env.ts
├── .env.example
├── .gitignore                    # Generated, then extended
├── .nvmrc
├── drizzle.config.ts
├── next.config.ts                # Generated, then edited
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs            # Generated by create-next-app
├── tsconfig.json                 # Generated
└── README.md
```

> **Note on `proxy.ts`**: Next.js 16 renamed `middleware.ts` to `proxy.ts`. We deliberately do not create this file. Auth is enforced in the `(app)/layout.tsx` Server Component, which is the pattern Next.js 16 recommends for real authorization checks (closer to the data, in the same execution context). Proxy files are for routing-level concerns like redirects, not security decisions.

---

## 4. Data Model

Before writing Drizzle code, confirm this model with the user. The key principle: **`entries` is identity, `entry_versions` is content**. There is no content duplication.

### `entries` (identity and lifecycle)

| Column               | Type                                   | Notes                                                                                          |
| -------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                 | text PK                                | cuid2                                                                                          |
| `created_at`         | integer NOT NULL                       | Unix ms, UTC. Time of first creation.                                                          |
| `deleted_at`         | integer                                | Unix ms, soft delete                                                                           |
| `current_version_id` | text NOT NULL FK → `entry_versions.id` | Points to the "published" / currently-displayed version. Rolling back = updating this pointer. |

Indexes: `deleted_at`, `current_version_id`.

### `entry_versions` (all mutable content)

| Column           | Type                            | Notes                                        |
| ---------------- | ------------------------------- | -------------------------------------------- |
| `id`             | text PK                         | cuid2                                        |
| `entry_id`       | text NOT NULL FK → `entries.id` |                                              |
| `version_number` | integer NOT NULL                | Starts at 1, monotonic per entry             |
| `entry_date`     | text NOT NULL                   | `YYYY-MM-DD`, user's local date              |
| `text`           | text NOT NULL default `''`      | Markdown                                     |
| `mood_score`     | integer                         | 1–5, nullable                                |
| `energy_score`   | integer                         | 1–5, nullable                                |
| `edited_at`      | integer NOT NULL                | Unix ms, UTC. Time this version was written. |

Unique `(entry_id, version_number)`. Index on `entry_id`. Index on `entry_date` (for calendar/list queries — we join to `entries.current_version_id` to find the current date).

**Write flow for new entry**:

1. Insert `entry_versions` row (version_number = 1)
2. Insert `entries` row with `current_version_id` pointing to that version
3. Both in one transaction

**Write flow for edit**:

1. Insert new `entry_versions` row (version_number = max + 1)
2. Update `entries.current_version_id` to the new version
3. Both in one transaction

**Query for current state** (most common): join `entries` → `entry_versions` on `current_version_id`.

### `tags` (normalized tag dictionary)

| Column         | Type                         | Notes                                                                                                |
| -------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`           | text PK                      | cuid2                                                                                                |
| `name`         | text UNIQUE NOT NULL         | Stored lowercase, trimmed. Display form can differ.                                                  |
| `display_name` | text NOT NULL                | The original casing the user typed first                                                             |
| `created_at`   | integer NOT NULL             |                                                                                                      |
| `usage_count`  | integer NOT NULL default `0` | Denormalized for fast "popular tags" queries in autocomplete. Maintained via triggers or query-time. |

Index on `name`. Index on `usage_count DESC` for autocomplete ordering.

### `entry_version_tags` (junction)

| Column       | Type                                   | Notes |
| ------------ | -------------------------------------- | ----- |
| `version_id` | text NOT NULL FK → `entry_versions.id` |       |
| `tag_id`     | text NOT NULL FK → `tags.id`           |       |

Primary key `(version_id, tag_id)`. Index on `tag_id` (for "all entries with tag X" queries).

Tags are versioned — changing an entry's tags creates a new `entry_versions` row, which has its own set of `entry_version_tags` rows. Old versions keep their original tag set. This gives true edit history including tag changes.

### `entries_fts` (FTS5 virtual table)

Virtual table with content: `text`, `tags_text` (space-separated tag display names).

A trigger on `entry_versions` insert populates FTS5 for the newly-created version by joining to `entry_version_tags` → `tags`. FTS5 rows are keyed by `version_id`.

Search flow: query FTS5 → filter to version ids that match `entries.current_version_id` for non-deleted entries. This means only current versions are searched by default. If full-history search is later wanted, we expose a flag to drop the `current_version_id` filter.

### `push_subscriptions`

| Column          | Type                                      | Notes                                 |
| --------------- | ----------------------------------------- | ------------------------------------- |
| `id`            | text PK                                   | cuid2                                 |
| `endpoint`      | text UNIQUE NOT NULL                      |                                       |
| `p256dh`        | text NOT NULL                             |                                       |
| `auth`          | text NOT NULL                             |                                       |
| `device_label`  | text NOT NULL default `'Unknown device'`  | User-editable                         |
| `user_agent`    | text                                      | For initial auto-labeling             |
| `timezone`      | text NOT NULL default `'Europe/Budapest'` | IANA                                  |
| `notify_hour`   | integer NOT NULL default `21`             | 0–23                                  |
| `notify_minute` | integer NOT NULL default `0`              | 0–59                                  |
| `enabled`       | integer NOT NULL default `1`              | Boolean                               |
| `created_at`    | integer NOT NULL                          |                                       |
| `last_seen_at`  | integer NOT NULL                          | Updated when the device opens the app |

### `notifications_sent`

| Column            | Type             | Notes                             |
| ----------------- | ---------------- | --------------------------------- |
| `subscription_id` | text NOT NULL FK |                                   |
| `date`            | text NOT NULL    | `YYYY-MM-DD` in subscription's tz |
| `sent_at`         | integer NOT NULL |                                   |

Primary key `(subscription_id, date)`. Prevents duplicate notifications if the cron fires twice.

### `audit_log`

| Column       | Type             | Notes                                                       |
| ------------ | ---------------- | ----------------------------------------------------------- |
| `id`         | text PK          | cuid2                                                       |
| `event`      | text NOT NULL    | e.g. `sign_in`, `sign_in_failed`, `export`, `entry_deleted` |
| `ip`         | text             |                                                             |
| `user_agent` | text             |                                                             |
| `metadata`   | text             | JSON, optional                                              |
| `created_at` | integer NOT NULL |                                                             |

### Auth.js tables

Managed by the Auth.js Drizzle adapter — generate them per the adapter's docs. Don't hand-design.

---

## 5. Build Phases

Execute each phase, then stop and report to the user. Do not continue without their "go" signal.

### Phase 1 — Bootstrap with create-next-app

1. Verify tooling versions:
   ```bash
   pnpm --version
   node --version
   ```
   Node must be ≥ 24. If not, stop and ask the user to install/switch.
2. **Bootstrap with create-next-app in the current empty directory**:
   ```bash
   pnpm create next-app@latest . --ts --tailwind --app --src-dir --use-pnpm --import-alias "@/*" --eslint
   ```
   When prompted with any interactive questions, accept defaults consistent with the flags above.
3. After it completes, **manually edit** these fields in `package.json` (do not touch `dependencies`):
   - `"name": "journal"`
   - `"private": true`
   - `"type": "module"` (usually already set)
   - Add: `"packageManager": "pnpm@<current>"` (use the actual installed pnpm version)
   - Add: `"engines": { "node": ">=24.0.0" }`
4. Create `.nvmrc` with content `24`.
5. Extend the generated `.gitignore`:
   ```
   # App-specific
   data/*.db
   data/*.db-journal
   data/*.db-shm
   data/*.db-wal
   .env
   .env.local
   .env.*.local
   ```
6. Add these `scripts` to `package.json` (manually editing `scripts` is allowed):
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint",
       "typecheck": "tsc --noEmit",
       "db:generate": "drizzle-kit generate",
       "db:migrate": "drizzle-kit migrate",
       "db:studio": "drizzle-kit studio",
       "db:push": "drizzle-kit push",
       "worker:dev": "tsx watch src/worker/index.ts",
       "worker:prod": "node dist/worker/index.js",
       "vapid:generate": "web-push generate-vapid-keys"
     }
   }
   ```
7. Run `pnpm dev`, confirm app loads at `http://localhost:3000`, **stop the dev server before moving on.**
8. Create a minimal `README.md` with the project name, one-line description, and a "Setup" section referencing `.env.example` (which we'll create in Phase 2).
9. **Report to user**: "Phase 1 done. Bootstrapped with create-next-app. Node/pnpm versions: [...]. Edited: package.json (name, engines, scripts), .gitignore, created .nvmrc and README.md. `pnpm dev` works. Ready for Phase 2?"

### Phase 2 — Database layer

1. Install Drizzle and SQLite:
   ```bash
   pnpm add drizzle-orm better-sqlite3
   pnpm add -D drizzle-kit @types/better-sqlite3 tsx
   ```
2. Install utilities:
   ```bash
   pnpm add @paralleldrive/cuid2 date-fns date-fns-tz zod
   pnpm add @t3-oss/env-nextjs
   ```
3. Create `src/env.ts` using `@t3-oss/env-nextjs`:
   - **Server**: `DATABASE_URL` (default `file:./data/journal.db`), `AUTH_SECRET`, `AUTH_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto: email), `ALLOWED_EMAIL` (the one user's email)
   - **Client**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
4. Create `.env.example` with every key present, values empty or obviously fake.
5. Create `src/db/schema.ts` per Section 4. Important implementation notes:
   - **Circular FK**: `entries.current_version_id` → `entry_versions.id`, and `entry_versions.entry_id` → `entries.id`. SQLite tolerates this if you defer the FK on `current_version_id` or create the column without an inline FK and add it via a later migration. The cleanest approach:
     - Declare both tables.
     - On `entries.current_version_id`, declare `.references(() => entryVersions.id)` — Drizzle generates the FK constraint; SQLite does not enforce FKs by default unless `PRAGMA foreign_keys = ON`, which we turn on in `client.ts` but allow deferred constraints via the driver's config.
     - In create flow, use a transaction that inserts the version first, then the entry, then updates the entry with the version id (or use `INSERT ... RETURNING` to capture ids in a single sequence).
   - FTS5 virtual table: Drizzle doesn't model FTS directly. Generate the normal schema migration with `pnpm db:generate`, then **hand-write a second SQL migration file** in `drizzle/` that creates:
     - The `entries_fts` virtual table
     - The triggers on `entry_versions` insert/delete and on `entry_version_tags` insert/delete that keep FTS in sync
     - Show this hand-written SQL to the user for review before applying.
6. Create `drizzle.config.ts`:
   ```ts
   import type { Config } from 'drizzle-kit';
   export default {
     schema: './src/db/schema.ts',
     out: './drizzle',
     dialect: 'sqlite',
     dbCredentials: { url: './data/journal.db' },
   } satisfies Config;
   ```
7. Create `src/db/client.ts` — exports a Drizzle client, enables `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` on connection.
8. Generate migration: `pnpm db:generate`. Review the output. Add the hand-written FTS migration. Apply: `pnpm db:migrate`. Confirm `data/journal.db` exists.
9. Write `src/db/queries/entries.ts` with:
   - `createEntry(input)` — creates entry + initial version + tag links, transactionally
   - `updateEntry(id, input)` — creates new version + tag links, updates `current_version_id`
   - `getEntry(id)` — returns entry with current version and tags (joined)
   - `listEntries(filters)` — paginated, filtered
   - `softDeleteEntry(id)`, `restoreEntry(id)`
   - `searchEntries(query)` — FTS5 search
   - `getVersionHistory(entryId)` — all versions with their tags
   - `rollbackToVersion(entryId, versionNumber)` — just updates `current_version_id`
10. Write `src/db/queries/tags.ts`:
    - `getOrCreateTag(name)` — normalizes (lowercase, trim), upserts
    - `suggestTags(prefix, limit)` — autocomplete: LIKE `prefix%` OR contains, ordered by `usage_count DESC`
    - `getPopularTags(limit)` — for initial autocomplete dropdown
    - `recomputeUsageCounts()` — maintenance fn; called from a nightly task or ad-hoc
11. Write a one-off script `scripts/seed-dev.ts` that creates 3 sample entries with varied tags. Run: `pnpm tsx scripts/seed-dev.ts`.
12. **Report to user**: schema overview, migration files (including the hand-written FTS one), sample data row counts.

### Phase 3 — Auth

1. Install Auth.js v5:
   ```bash
   pnpm add next-auth@beta @auth/drizzle-adapter
   ```
2. Install passkey support. As of early 2026, check the Auth.js v5 docs for the current passkey provider location (it may be `@auth/webauthn` or bundled). **Verify via web search before installing.**
3. Install nodemailer for magic link fallback:
   ```bash
   pnpm add nodemailer
   pnpm add -D @types/nodemailer
   ```
4. Configure `src/lib/auth.ts`:
   - Drizzle adapter
   - Passkey provider
   - Email provider (magic link) — reject any email other than `env.ALLOWED_EMAIL` in the `signIn` callback
   - Session strategy: `database`
   - Cookie config: `httpOnly`, `secure` in prod, `sameSite: lax`, 90-day expiry, rolling refresh
5. Create `src/app/api/auth/[...nextauth]/route.ts`.
6. Create `src/app/(auth)/sign-in/page.tsx` — minimal UI (we'll style it properly after Phase 4): "Sign in with passkey" button and "Email me a link" button.
7. Create `src/app/(app)/layout.tsx`:
   ```tsx
   import { auth } from '@/lib/auth';
   import { redirect } from 'next/navigation';
   export default async function AppLayout({ children }: { children: React.ReactNode }) {
     const session = await auth();
     if (!session) redirect('/sign-in');
     return <>{children}</>;
   }
   ```
   This is the **primary auth guard**. Next.js 16 docs explicitly recommend Server Component guards over proxy-level checks for real authorization. We do not create `proxy.ts`.
8. Add `signIn` / `signOut` Server Actions in `src/actions/auth.ts`.
9. Generate `AUTH_SECRET`: `openssl rand -base64 32`. Put it in `.env` (not committed). Put the placeholder in `.env.example`.
10. **Manual test flow**: walk the user through first passkey registration on their primary device.
11. **Report to user**.

### Phase 4 — shadcn/ui setup (Base UI preset)

1. Run the user-specified preset init:
   ```bash
   pnpm dlx shadcn@latest init --preset b5vnDiSxs --base base --template next
   ```
   This preset includes:
   - Base UI primitives (not Radix)
   - A color scale configuration
   - `lucide-react` as the icon library (no separate install needed)
2. Verify `components.json` reflects the Base UI configuration and that `lucide-react` appears in `pnpm list`.
3. Install the components we'll need initially:
   ```bash
   pnpm dlx shadcn@latest add button input textarea label card dialog popover calendar select badge separator sheet tabs sonner command
   ```
   Notes:
   - `sonner` is for toast notifications (the shadcn-preferred toast lib since late 2024)
   - `command` is for the tag combobox / autocomplete
4. If any component does not have a Base UI variant available and falls back to Radix, **explicitly list those components to the user** after this step so they know what's mixed.
5. Ask the user: "Dark mode from day 1, or later?" If yes, add a theme toggle using `next-themes`.
6. **Report to user** with the list of installed components.

### Phase 5 — Core journal UI (with Conform for forms)

1. Install form and markdown deps:
   ```bash
   pnpm add @conform-to/react @conform-to/zod
   pnpm add react-markdown remark-gfm
   ```
2. Create `src/lib/validation.ts` with shared Zod schemas:
   - `entryInputSchema` — text (max 100k chars), mood_score (1-5 optional), energy_score (1-5 optional), entry_date (YYYY-MM-DD, must parse), tags (string array, each 1-40 chars, max 20 tags)
3. Create `src/actions/entries.ts` with Server Actions:
   - `createEntryAction(prevState, formData)` — parseWithZod, call `createEntry`, return state
   - `updateEntryAction(prevState, formData)` — parseWithZod, call `updateEntry`
   - `softDeleteEntryAction(id)`, `restoreEntryAction(id)`, `rollbackVersionAction(entryId, versionNumber)`
   - All return `{ status: 'success' | 'error', ... }` shape compatible with `useActionState`
4. Create `src/components/journal/TagCombobox.tsx` (client component):
   - Uses shadcn `Command` primitive
   - Fetches tag suggestions via a Server Action `suggestTagsAction(prefix)` with debounce
   - Supports "create new tag" inline
   - Writes selected tag names as a JSON string into a hidden input, which Conform picks up
5. Create `src/components/journal/EntryForm.tsx`:
   - Uses `useForm` from `@conform-to/react` with `parseWithZod(formData, { schema: entryInputSchema })`
   - Date picker (default: today in user tz) — use shadcn Calendar inside a Popover
   - Markdown textarea with live preview toggle
   - Mood and Energy sliders (1–5)
   - `TagCombobox`
   - Submit button disabled while action is pending (use `useActionState`'s pending)
6. Create `src/components/journal/EntryCard.tsx` — renders one entry (current version): Markdown text, mood/energy badges, tag list, edit/delete buttons, small "Backdated"/"Scheduled" badge based on `entry_date` vs today.
7. Create `src/app/(app)/page.tsx` — Today view: new-entry form at top, today's entries below.
8. Create `src/app/(app)/entry/[id]/page.tsx` — single entry detail + inline edit.
9. Create `src/app/(app)/entry/[id]/history/page.tsx` — version list with timestamps and tag changes per version. Include a "Restore this version" button per historical version (calls `rollbackVersionAction`).
10. Optionally install `diff`:
    ```bash
    pnpm add diff
    pnpm add -D @types/diff
    ```
    for side-by-side text diff between two versions.
11. **Report to user**. At this point the app is functionally usable locally.

### Phase 6 — Calendar, list, search

1. Create `src/app/(app)/calendar/page.tsx` — month grid. Days with entries get a color dot based on avg mood (or neutral if no mood set). Click a day → server-rendered view of that day's entries + "new entry on this day" button.
2. Create `src/app/(app)/search/page.tsx` — FTS5-backed search with filters: date range, tag multi-select, mood range. Searches via server action or server component with search params. Handles keyset pagination.
3. List view gets its own route under `(app)` if needed, or is the "browse" tab on the home view — decide with user.
4. **Report to user**.

### Phase 7 — Export

1. Create Server Actions `exportJsonAction()` and `exportMarkdownAction()`:
   - JSON: full dump — all entries with current version and full version history, all tags, push subscriptions (without secret keys), audit log. Include schema version number.
   - Markdown: concatenated file, entries in chronological order by `entry_date`, each with YAML frontmatter (`date`, `mood`, `energy`, `tags`, `created_at`). Versions not included in Markdown export (noisy) — only current.
2. Expose download buttons in `/settings`.
3. Log every export to `audit_log`.
4. **Report to user**.

### Phase 8 — Dockerize

Ask the user **before writing the compose file**:

- "What is your Traefik network name in docker?"
- "What is your Traefik certresolver name?"
- "Which R2 bucket name for backups?"

Then:

1. Set `output: 'standalone'` in `next.config.ts`.
2. Create `docker/Dockerfile` — multi-stage:
   - **Stage 1 (deps)**: `node:24-alpine`, install pnpm via corepack, copy `package.json` + `pnpm-lock.yaml`, `pnpm fetch`, `pnpm install --offline`
   - **Stage 2 (builder)**: copy source, `pnpm build`, also build the worker: `pnpm exec tsc -p tsconfig.worker.json --outDir dist` (create this tsconfig to emit the worker + db modules to `dist/`)
   - **Stage 3 (runner)**: `node:24-alpine` runtime, copy `.next/standalone`, `.next/static`, `public`, `dist/`, install `better-sqlite3` native bindings if needed
3. Entry points:
   - Web: `CMD ["node", "server.js"]` (from standalone)
   - Worker: overridden in compose with `command: node dist/worker/index.js`
4. Create `docker/docker-compose.yml`:

   ```yaml
   services:
     web:
       build: ..
       volumes:
         - ./data:/data
       environment:
         DATABASE_URL: file:/data/journal.db
         # ... all other env vars
       labels:
         - 'traefik.enable=true'
         - 'traefik.http.routers.journal.rule=Host(`naplo.csalex.dev`)'
         - 'traefik.http.routers.journal.entrypoints=websecure'
         - 'traefik.http.routers.journal.tls.certresolver=${TRAEFIK_RESOLVER}'
         - 'traefik.http.services.journal.loadbalancer.server.port=3000'
       networks:
         - ${TRAEFIK_NETWORK}
       healthcheck:
         test: ['CMD', 'wget', '-q', '-O-', 'http://localhost:3000/api/health']
         interval: 30s
         timeout: 5s
         retries: 3

     worker:
       build: ..
       command: node dist/worker/index.js
       volumes:
         - ./data:/data
       environment:
         DATABASE_URL: file:/data/journal.db
         # ... same env

     litestream:
       image: litestream/litestream:latest
       command: replicate -config /etc/litestream.yml
       volumes:
         - ./data:/data
         - ./litestream.yml:/etc/litestream.yml:ro
       environment:
         LITESTREAM_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
         LITESTREAM_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}

   networks:
     ${TRAEFIK_NETWORK}:
       external: true
   ```

   Substitute real values from the user's answers.

5. Create `docker/litestream.yml`:
   ```yaml
   dbs:
     - path: /data/journal.db
       replicas:
         - type: s3
           endpoint: https://<r2-account-id>.r2.cloudflarestorage.com
           bucket: <bucket-name>
           path: journal
           region: auto
   ```
6. Create `src/app/api/health/route.ts`:
   ```ts
   export async function GET() {
     return Response.json({ ok: true });
   }
   ```
7. **Report to user**.

### Phase 9 — PWA

1. Install Serwist:
   ```bash
   pnpm add serwist @serwist/next
   pnpm add -D @serwist/cli
   ```
2. Configure `next.config.ts` with `withSerwist`.
3. Create `src/app/sw.ts` — Serwist precache + runtime caching (stale-while-revalidate for app shell, network-first for `/api/*`).
4. Create `public/manifest.webmanifest`:
   - `name: "Journal"`, `short_name: "Journal"`
   - `display: "standalone"`, `start_url: "/"`
   - `theme_color`, `background_color`
   - Icon entries (user will provide real icons later; create 192x192 and 512x512 placeholders)
5. Link manifest in `src/app/layout.tsx` metadata.
6. Add an "Install to Home Screen" hint in `/settings` with iOS-specific instructions.
7. **Report to user**.

### Phase 10 — Push notifications

1. Install:
   ```bash
   pnpm add web-push node-cron
   pnpm add -D @types/web-push @types/node-cron
   ```
2. Generate VAPID keys: `pnpm vapid:generate`. Put them in `.env`. **Tell the user to back these up** — losing them invalidates every subscription.
3. Create `data/prompts.json` with ~45 rotating English prompts:
   ```json
   [
     "What was the best moment today?",
     "What surprised you today?",
     "What are you grateful for right now?",
     "What drained your energy today?",
     "What's on your mind that you haven't said out loud?",
     "What did you learn today?",
     "What would you tell yourself a year ago?",
     "What emotion dominated today?",
     "What small thing went well?",
     "What do you want tomorrow to look like?",
     "Who made you smile today?",
     "What felt difficult today?",
     "What did you notice that you usually miss?",
     "What are you looking forward to?",
     "What would make tomorrow 1% better?",
     "What's one thing you did just for yourself today?",
     "What's a question you're sitting with?",
     "What's something you're proud of today?",
     "What did your body tell you today?",
     "What conversation stayed with you?"
   ]
   ```
   (Keep adding until ~45 entries. User can edit this file anytime.)
4. Create `src/lib/push.ts`:
   - `sendPush(subscription, payload)` — wraps `web-push.sendNotification`; handles `410 Gone` by disabling subscription
   - `pickDailyPrompt(date: string)` — deterministic by date hash
5. Create `src/app/api/push/subscribe/route.ts` and `unsubscribe/route.ts`. The subscribe endpoint accepts the PushSubscription JSON, saves with auto-derived device_label from user-agent.
6. Create `src/app/(app)/devices/page.tsx`:
   - List current subscriptions with rename, timezone change, notify time, enable/disable, delete
   - Button: "Enable notifications on this device" (triggers `Notification.requestPermission()` + subscribe)
   - Button: "Send test notification to this device"
7. Create `src/worker/index.ts`:
   - node-cron with `* * * * *`
   - Each tick: fetch enabled subscriptions; for each, compute "now" in its timezone; if HH:MM matches notify_hour:notify_minute:
     - Get today-in-tz as YYYY-MM-DD
     - Skip if `notifications_sent(subscription_id, today)` exists
     - Check if any entry exists with `entry_date = today` and `deleted_at IS NULL` (joining `entries` → `entry_versions` on `current_version_id`)
     - If none, send push with `pickDailyPrompt(today)`, insert `notifications_sent`
   - On `410 Gone`, set `enabled = 0`
8. Service worker push handler in `src/app/sw.ts`:
   ```ts
   self.addEventListener('push', (event) => {
     const data = event.data?.json() ?? { title: 'Journal', body: '' };
     event.waitUntil(
       self.registration.showNotification(data.title, {
         body: data.body,
         icon: '/icons/192.png',
         badge: '/icons/badge.png',
         data: { url: '/' },
       }),
     );
   });
   self.addEventListener('notificationclick', (event) => {
     event.notification.close();
     event.waitUntil(self.clients.openWindow(event.notification.data.url));
   });
   ```
9. **iOS note**: document prominently that iOS ≥ 16.4 requires PWA installation to Home Screen before push subscription works.
10. Test manually: subscribe on desktop, trigger cron with a test script that forces "today's notify time".
11. **Report to user**.

### Phase 11 — Cloudflare Access & first deploy

1. User task (in CF dashboard): create a Zero Trust Access application for `naplo.csalex.dev`, policy: allow only their email.
2. Document the steps in `README.md` (policy name, rule, identity provider).
3. User task: create R2 bucket, generate access key pair, add to `.env` on VPS.
4. Deploy: `docker compose up -d`, run initial `db:migrate` in the running container (or have the container do it on startup).
5. Document a **backup restore drill** in `README.md`.
6. Verify Cloudflare Access + app auth both work on first real access.
7. **Report to user**.

### Phase 12 — CI

1. Create `.github/workflows/ci.yml`:
   - Trigger: push, pull_request
   - Node 24, pnpm with store caching
   - Steps: install, lint, typecheck, build
2. Create `.github/dependabot.yml` for weekly pnpm updates.
3. **Report to user**.

### Phase 13 — Polish (ongoing)

- Stats page: mood/energy line chart over time (`recharts`)
- Streak counter
- Weekly summary (auto-generated)
- Keyboard shortcuts
- **Dark/light mode toggle** — app currently hardcoded dark; add a user-controlled theme switch using `next-themes` with preference persisted to localStorage. Toggle button in `/settings`.
- Entry templates

---

## 6. Development Conventions

- **Server Components by default.** `'use client'` only where necessary (form state, browser APIs, `useEffect`).
- **Server Actions for mutations.** REST routes only for non-browser clients (push subscribe, health check).
- **Zod schemas at every input boundary.** All under `src/lib/validation.ts`, shared between Conform and Server Actions.
- **Timezone rules**:
  - Timestamps stored as Unix ms (UTC)
  - `entry_date` stored as `YYYY-MM-DD` in the user's / device's local tz
  - "Today" computed with `date-fns-tz`
- **Server Action error shape**: `{ status: 'success', data } | { status: 'error', message, errors? }`. No throwing across boundaries.
- **No dead code.** Don't scaffold files you won't fill out in the same phase.
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- **Tiny atomic commits.**

---

## 7. Security Checklist

Before the first public deploy, verify:

- [ ] Cloudflare Access application is live on `naplo.csalex.dev` with a restrictive policy
- [ ] Application-level auth works (passkey registered, sign-in required)
- [ ] Session cookies: `httpOnly`, `secure`, `sameSite: lax`
- [ ] CSRF protection active (Auth.js handles this; verify)
- [ ] All Server Actions validate with Zod
- [ ] Rate limiting on `/api/auth/*` and on push subscribe
- [ ] VAPID keys **not** in git; backed up
- [ ] `.env` gitignored
- [ ] `AUTH_SECRET` is strong random (`openssl rand -base64 32`)
- [ ] `ALLOWED_EMAIL` restricts magic links to user's address only
- [ ] SQLite file permissions `600` on host
- [ ] Litestream is running and has successfully replicated
- [ ] Restore drill performed successfully

---

## 8. Backup & Restore Procedure

Document in `README.md`:

**Backup**: continuous via Litestream to R2 bucket `<bucket-name>`.

**Restore drill** (monthly):

1. `litestream restore -o /tmp/restored.db s3://<bucket>/journal`
2. `sqlite3 /tmp/restored.db` — verify row counts match production
3. If the drill fails, treat it as a production incident. Untested backup = no backup.

**Secondary backup**: in-app JSON export (kept in password manager / encrypted drive).

---

## 9. Questions to Ask the User at Specific Phases

- **Before Phase 3**: "Passkey only, or passkey + email magic link fallback?"
- **Before Phase 4**: "Dark mode from day 1, or later?"
- **Before Phase 8**: "What is your Traefik network name, certresolver name, and R2 bucket name?"
- **Before Phase 10**: "One notification time per device, or a global default?"
- **Before Phase 11**: "Can you set up Cloudflare Access yourself, or want to walk through it together?"

---

## 10. When You're Unsure

- Next.js 16, Auth.js v5, shadcn/ui Base UI, Serwist, and Tailwind v4 all evolved during 2025 and early 2026. **If a package API you remember has moved, check the current official docs via web search before writing code.**
- If two approaches are viable, pick the simpler one and note the trade-off.
- If something in this spec contradicts reality (deprecated package, moved API), **stop and ask the user** rather than silently deviating.
- If `pnpm create next-app@latest` produces a different skeleton than this spec assumes (flags changed, files renamed), adapt gracefully and tell the user what differed.

---

## 11. First Message to the User

When you begin, reply exactly with:

> I've read the Journal build spec. I'll build it in 13 phases, checking in after each. Starting with Phase 1: bootstrap via `pnpm create next-app` into this directory. I'll verify pnpm and Node 24 first, then run the bootstrap. Ready when you are — say "go" and I'll start.

Then wait for confirmation before running any commands.
