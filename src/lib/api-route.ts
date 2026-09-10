// What every protected route handler repeats: prove there is a session, apply
// the route's throttle, and answer refusals the same way everywhere.
//
// Kept apart from `rate-limit.ts` on purpose. That module is pure policy and is
// exercised on its own; this one reaches for `auth()` and Next's response
// helpers, which would drag the whole NextAuth config into anything that only
// wanted to count requests.

import type { Dictionary } from '@/i18n/dictionary';
import { getDict } from '@/i18n/request';
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import type { RateLimitRejection, RateLimitResult } from '@/lib/rate-limit';

/**
 * The 429 every throttled route returns, `Retry-After` included.
 *
 * Takes the rejection rather than a bare number so it cannot be called on a
 * request that was actually allowed: producing one means the caller narrowed.
 * The message stays a parameter because the AI routes say something else, and
 * the client shows whichever text arrives to the user verbatim.
 *
 * Async only for the default: reading the language is a request-scoped await,
 * and it happens on the refusal path, never on the one that was allowed.
 */
export async function tooManyRequests(
  rejection: RateLimitRejection,
  message?: string,
): Promise<NextResponse> {
  return NextResponse.json(
    { error: message ?? (await getDict()).errors.api.tooManyRequests },
    { status: 429, headers: { 'Retry-After': String(rejection.retryAfter) } },
  );
}

type SessionHandler = (req: NextRequest, ctx: { userId: string }) => Promise<Response>;

type WithSessionOptions = {
  /** The throttle for this route, keyed by the signed-in user's id. */
  limit?: (key: string) => RateLimitResult;
  /**
   * Overrides the 429 body — used where the message is shown to the user.
   *
   * A selector rather than a string, because `withSession` is called once at
   * module load and the language is decided per request: a route names the key
   * it wants (`(d) => d.errors.api.tooFast`) and the dictionary is only read if
   * the throttle actually fires.
   */
  limitMessage?: (d: Dictionary) => string;
};

/**
 * Wrap a route handler so it only runs for a signed-in user, optionally behind
 * a rate limit.
 *
 * The handler receives the user id, which is what the callers actually wanted
 * from the session. Requiring an id rather than merely a session is a little
 * stricter than the push routes used to be — a database session always carries
 * one — and it means every throttle key is derived the same way.
 *
 * POST /api/sync deliberately does not use this: its 401 body is
 * `{ ok: false, error }`, a shape the service worker depends on, and bending
 * this helper to serve one caller's contract would cost more than it saves.
 */
export function withSession(
  handler: SessionHandler,
  options: WithSessionOptions = {},
): (req: NextRequest) => Promise<Response> {
  return async (req) => {
    const session = await auth();
    if (!session?.user?.id) {
      const d = await getDict();
      return NextResponse.json({ error: d.errors.api.unauthorized }, { status: 401 });
    }
    const userId = session.user.id;

    if (options.limit) {
      const limited = options.limit(userId);
      if (!limited.ok) {
        const message = options.limitMessage?.(await getDict());
        return tooManyRequests(limited, message);
      }
    }

    return handler(req, { userId });
  };
}
