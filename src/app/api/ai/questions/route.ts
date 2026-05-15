export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { formatInTimeZone } from 'date-fns-tz';
import { auth } from '@/lib/auth';
import { listEntries } from '@/db/queries/entries';
import { getAnthropicClient, QUESTIONS_MODEL } from '@/lib/ai/anthropic';

const requestSchema = z.object({
  todayText: z.string().max(4000).optional(),
});

const toolResponseSchema = z.object({
  questions: z.array(z.string().min(1)).length(3),
});

const SYSTEM_PROMPT = `Egy napi reflexiós napló asszisztense vagy. A felhasználó éppen most tölti ki a mai bejegyzést, és segítséget kér: tegyél fel pontosan 3 rövid, konkrét, nyitott kérdést, amik segítenek pontosabb képet rajzolni a mai napjáról.

Támaszkodj az előző napok bejegyzéseire és a hozzájuk tartozó címkékre (a címkék témajelölők). Ha valamit elkezdett, szorongott valami miatt, vagy tervezett valamit, kérdezz rá konkrétan. Ha a címkék között visszatérő téma van (pl. "edzés", "munka"), kérdezhetsz a folytatásról.

Szabályok:
- Pontosan 3 kérdés.
- Tegezve, magyarul.
- Egy kérdés max. 1 mondat.
- Ne kérdezz zárt (igen/nem) kérdést.
- Ne ismételd, amit ma már leírt.

A választ kizárólag a \`submit_questions\` tool meghívásával add vissza.`;

const RATE_LIMIT_MS = 5000;
const lastCallByUser = new Map<string, number>();

function buildUserMessage(
  priorDays: { entry_date: string; text: string; tagNames: string[] }[],
  todayText: string | undefined,
): string {
  const priorSection =
    priorDays.length === 0
      ? '(nincs korábbi bejegyzés)'
      : priorDays
          .map((d) => {
            const labels = d.tagNames.length > 0 ? d.tagNames.join(', ') : 'nincs';
            return `### ${d.entry_date} (címkék: ${labels})\n${d.text}`;
          })
          .join('\n\n');

  const todaySection = todayText && todayText.trim().length > 0 ? todayText : '(még üres)';

  return `## Előző napok:\n\n${priorSection}\n\n## Mai (még nem mentett) szöveg:\n${todaySection}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  // Rate limit (per-user, in-process)
  const now = Date.now();
  const last = lastCallByUser.get(userId);
  if (last !== undefined && now - last < RATE_LIMIT_MS) {
    return NextResponse.json({ error: 'Túl gyors, várj egy kicsit' }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    rawBody = {};
  }
  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { todayText } = parsed.data;

  // Today's date in the app's timezone (so "today" matches user's calendar day).
  const todayStr = formatInTimeZone(new Date(), 'Europe/Budapest', 'yyyy-MM-dd');

  // Pull a bit more than 3 entries so we can filter out today + empty-text ones.
  const recent = listEntries({ page_size: 10 });
  const priorDays = recent
    .filter((e) => e.version.entry_date !== todayStr)
    .filter((e) => e.version.text.trim().length > 0)
    .slice(0, 3)
    // Show oldest → newest in the prompt for natural reading order.
    .reverse()
    .map((e) => ({
      entry_date: e.version.entry_date,
      text: e.version.text,
      tagNames: e.version.tags.map((t) => t.display_name),
    }));

  const userMessage = buildUserMessage(priorDays, todayText);

  // Update rate-limit timestamp BEFORE the API call so two near-simultaneous
  // requests can't both slip past the check.
  lastCallByUser.set(userId, now);

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: QUESTIONS_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [
        {
          name: 'submit_questions',
          description: 'Visszaadja a 3 reflektív kérdést a mai napi naplóhoz.',
          input_schema: {
            type: 'object' as const,
            properties: {
              questions: {
                type: 'array',
                items: { type: 'string' },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ['questions'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_questions' },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolUse = message.content.find((b) => b.type === 'tool_use');
    if (!toolUse) {
      console.error('[ai/questions] no tool_use block in response');
      return NextResponse.json({ error: 'AI hibás választ adott' }, { status: 502 });
    }

    const validated = toolResponseSchema.safeParse(toolUse.input);
    if (!validated.success) {
      console.error('[ai/questions] tool_use input failed validation', validated.error);
      return NextResponse.json({ error: 'AI hibás választ adott' }, { status: 502 });
    }

    const [q1, q2, q3] = validated.data.questions;
    return NextResponse.json({ questions: [q1, q2, q3] satisfies [string, string, string] });
  } catch (err) {
    console.error('[ai/questions]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

