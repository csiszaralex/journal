export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { removeSubscription } from "@/db/queries/subscriptions";
import { logAudit } from "@/db/queries/audit";
import { pushUnsubscribeSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = pushUnsubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  const { endpoint } = parsed.data;

  removeSubscription(endpoint);
  logAudit("push.unsubscribe");

  return NextResponse.json({ ok: true });
}
