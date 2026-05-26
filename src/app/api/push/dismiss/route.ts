export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { dismissNotificationsForDate } from '@/lib/push';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });

  await dismissNotificationsForDate(parsed.data.date);
  return NextResponse.json({ ok: true });
}

