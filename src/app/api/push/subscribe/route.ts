export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withSession } from "@/lib/api-route";
import { limitPush } from "@/lib/rate-limit";
import { upsertSubscription } from "@/db/queries/subscriptions";
import { logAudit } from "@/db/queries/audit";
import { friendlyNameFromUA } from "@/lib/user-agent";
import { pushSubscribeSchema } from "@/lib/validation";

// Session-gated already, so the throttle is depth rather than the first line of
// defence: it caps what a stolen session could do to the push tables.
export const POST = withSession(async (req) => {
  const parsed = pushSubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const { endpoint, keys, timezone } = parsed.data;

  const userAgent = req.headers.get("user-agent") ?? undefined;
  const deviceLabel = friendlyNameFromUA(userAgent);

  const id = upsertSubscription({
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    device_label: deviceLabel,
    user_agent: userAgent,
    timezone: timezone ?? "Europe/Budapest",
  });

  logAudit("push.subscribe", { subscription_id: id, device_label: deviceLabel });

  return NextResponse.json({ id });
}, { limit: limitPush });
