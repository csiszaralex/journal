export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { upsertSubscription } from "@/db/queries/subscriptions";
import { logAudit } from "@/db/queries/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { endpoint, keys, timezone } = body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    timezone?: string;
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") ?? undefined;
  const deviceLabel = deriveLabel(userAgent);

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
}

function deriveLabel(ua: string | undefined): string {
  if (!ua) return "Unknown device";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown device";
}
