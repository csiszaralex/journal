export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withSession } from "@/lib/api-route";
import { limitPush } from "@/lib/rate-limit";
import { removeSubscription } from "@/db/queries/subscriptions";
import { logAudit } from "@/db/queries/audit";
import { pushUnsubscribeSchema } from "@/lib/validation";

export const POST = withSession(async (req) => {
  const parsed = pushUnsubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  const { endpoint } = parsed.data;

  removeSubscription(endpoint);
  logAudit("push.unsubscribe");

  return NextResponse.json({ ok: true });
}, { limit: limitPush });
