export const dynamic = "force-dynamic";

import { handlers } from "@/lib/auth";
import { tooManyRequests } from "@/lib/api-route";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// The only surface a stranger can reach: there is no gate in front of the app,
// so every WebAuthn ceremony starts here unauthenticated. A ceremony costs a
// handful of requests, so this is roomy for a person at the keyboard and tight
// for a script. Throttled per address, never blocked.
const AUTH_LIMIT = 20;
const AUTH_WINDOW_MS = 60_000;

type AuthHandler = (typeof handlers)["GET"];

// Not `withSession`: this is the route people reach *before* they have a
// session, so the key is the caller's address rather than a user id.
function withRateLimit(handler: AuthHandler): AuthHandler {
  return async (req) => {
    const limited = rateLimit(`auth:${clientIp(req)}`, {
      limit: AUTH_LIMIT,
      windowMs: AUTH_WINDOW_MS,
      event: "auth.rate_limited",
    });
    if (!limited.ok) return tooManyRequests(limited);
    return handler(req);
  };
}

export const GET = withRateLimit(handlers.GET);
export const POST = withRateLimit(handlers.POST);
