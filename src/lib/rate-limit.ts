// In-process request throttling.
//
// The app runs as a single Next.js container, so a Map is the whole store: no
// table to write on every request, no cleanup job. It resets on deploy, which
// is fine — this exists to make hammering expensive, not to keep a ledger.
//
// Everything here throttles, never bans. Sign-in is passkey-only, so a lockout
// that misfires would shut the owner out of their own journal with no way back
// except editing the database; a window that expires on its own cannot.

import { logAudit, type CategoryEvent } from '@/db/queries/audit';

type Bucket = {
  /** Request timestamps inside the current window, oldest first. */
  hits: number[];
  /** When the current window's limit breach was logged, so it is logged once. */
  loggedAt?: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Drop buckets nothing has touched for a while. Called on each check, which is
 * enough: the map only grows while requests arrive, and the sweep is bounded by
 * how many distinct keys were seen in the last window.
 */
function sweep(now: number, windowMs: number) {
  for (const [key, bucket] of buckets) {
    const newest = bucket.hits[bucket.hits.length - 1];
    if (newest === undefined || now - newest > windowMs * 2) buckets.delete(key);
  }
}

/**
 * A refused request, carrying how long the caller must wait. Named separately
 * so the renderer can take one: having narrowed far enough to hold a rejection
 * is the proof that there is something to render.
 */
export type RateLimitRejection = {
  ok: false;
  /** Seconds until the caller may retry. */
  retryAfter: number;
};

/**
 * Discriminated on `ok`, so `retryAfter` exists only where it means something —
 * the allowed branch has no wait to report, and the compiler refuses to read one.
 */
export type RateLimitResult = { ok: true } | RateLimitRejection;

/**
 * Record a request against `key` and say whether it is within `limit` per
 * `windowMs`. A rejected request is not recorded, so a caller that keeps
 * hammering cannot push its own window further out.
 *
 * `event` names the limit in the audit log; the breach is logged once per
 * window per key, because a line per rejected request would let an attacker
 * fill the log by making requests.
 */
export function rateLimit(
  key: string,
  { limit, windowMs, event }: { limit: number; windowMs: number; event?: CategoryEvent },
): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    if (event && (bucket.loggedAt === undefined || now - bucket.loggedAt >= windowMs)) {
      bucket.loggedAt = now;
      logAudit(event, { key, limit, window_ms: windowMs });
    }
    buckets.set(key, bucket);
    return { ok: false, retryAfter };
  }

  bucket.hits.push(now);
  bucket.loggedAt = undefined;
  buckets.set(key, bucket);
  return { ok: true };
}

/**
 * The client address as the reverse proxy reports it. Spoofable by anything
 * that can reach the container directly, which is acceptable for a throttle:
 * a forged header only buys the forger their own allowance, it cannot lock
 * anyone else out. Falls back to a shared key when no header is present, so an
 * unproxied deployment throttles everyone together rather than not at all.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * The limit the three push routes share. They are session-gated already, so
 * this is depth rather than the first line of defence: it caps what a stolen
 * session could do to the push tables. Roomy enough that enabling, renaming and
 * retiming a few devices in one sitting never trips it.
 *
 * Not applied to POST /api/sync on purpose: that endpoint replays writes made
 * offline, so returning from a week without a network legitimately arrives as a
 * burst — a limit there would break the app's own recovery path.
 */
export function limitPush(key: string): RateLimitResult {
  return rateLimit(`push:${key}`, { limit: 60, windowMs: 60_000, event: 'push.rate_limited' });
}

/**
 * One AI call per user every 5 seconds. The three AI routes each carried their
 * own copy of this; keeping it here means the three cannot drift apart.
 *
 * Not audit-logged: the only person who can trip it is the owner, pressing
 * their own button twice, and a log line per double-click is noise.
 */
export function limitAi(userId: string): RateLimitResult {
  return rateLimit(`ai:${userId}`, { limit: 1, windowMs: 5_000 });
}

// What a throttled AI route says used to live here, as a Hungarian constant.
// It is now `errors.api.tooFast` in the dictionary, which the three routes hand
// to `withSession` as their `limitMessage`. This module stays free of the
// dictionary and of anything framework-shaped on purpose: it is pure policy,
// exercised on its own, and the cron worker's bundle must not grow a copy of
// both languages to count requests.

/** Only for tests: forget every bucket. */
export function resetRateLimits(): void {
  buckets.clear();
}

