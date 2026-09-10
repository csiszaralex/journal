export const dynamic = 'force-dynamic';

import { getDict } from '@/i18n/request';
import { withSession } from '@/lib/api-route';
import { limitPush } from '@/lib/rate-limit';
import { dismissNotificationsForDate } from '@/lib/push';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const POST = withSession(async (req) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const d = await getDict();
    return NextResponse.json({ error: d.errors.api.invalidDate }, { status: 400 });
  }

  await dismissNotificationsForDate(parsed.data.date);
  return NextResponse.json({ ok: true });
}, { limit: limitPush });

