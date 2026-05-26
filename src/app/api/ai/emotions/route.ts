export const dynamic = 'force-dynamic';

import { logAudit } from '@/db/queries/audit';
import { getPopularEmotions } from '@/db/queries/emotions';
import { getAnthropicClient, QUESTIONS_MODEL } from '@/lib/ai/anthropic';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  currentEmotions: z.array(z.string().min(1).max(200)).max(50).optional(),
  entryContent: z.string().max(4000).optional(),
});

const SYSTEM_PROMPT = `You are an assistant for a daily reflective journal. The user is writing a journal entry and wants suggestions for emotions that match their current state.

You receive:
- The top 50 most-used emotions in the journal (for reference, not as a constraint)
- The user's current emotions for this entry
- Optionally, what the user has written so far today

Your job: suggest up to 3 emotions that fit the entry's mood and context.

Rules:
1. You MAY suggest emotions from the existing list, or entirely new emotions not on the list.
2. Never suggest an emotion the user has already selected for this entry.
3. Keep emotion names short: 1-3 words maximum, lowercase.
4. Suggest emotions that are specific and meaningful, not generic catch-alls like "happy" or "sad" unless contextually appropriate.
5. If the entry content is empty, base suggestions on the current emotions already selected.

OUTPUT LANGUAGE: Emotion names must match the language the user is writing in (detected from entry content or existing emotions). If the journal is in Hungarian, return Hungarian emotion words. If English, return English. Default to Hungarian if uncertain.

Return your suggestions ONLY via the \`submit_emotions\` tool. Do not produce any free text.`;

const RATE_LIMIT_MS = 5000;
const lastCallByUser = new Map<string, number>();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

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
  const { currentEmotions = [], entryContent } = parsed.data;

  const popularEmotions = getPopularEmotions(50).map((e) => e.display_name);

  const userMessage = [
    '## Top 50 most-used emotions in this journal (for reference):',
    popularEmotions.length > 0 ? popularEmotions.join(', ') : '(none yet)',
    '',
    '## Currently selected emotions for this entry:',
    currentEmotions.length > 0 ? currentEmotions.join(', ') : '(none)',
    '',
    "## Today's entry draft:",
    entryContent && entryContent.trim().length > 0 ? entryContent : '(empty so far)',
    '',
    '## Task',
    'Suggest up to 3 emotions that fit this entry. Do not repeat any currently selected emotion.',
  ].join('\n');

  lastCallByUser.set(userId, now);

  const toolResponseSchema = z.object({
    emotions: z.array(z.string().min(1).max(100)).max(3),
  });

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: QUESTIONS_MODEL,
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [
        {
          name: 'submit_emotions',
          description: 'Submit up to 3 emotion suggestions for the journal entry.',
          input_schema: {
            type: 'object' as const,
            properties: {
              emotions: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 3,
              },
            },
            required: ['emotions'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_emotions' },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolUse = message.content.find((b) => b.type === 'tool_use');
    if (!toolUse) {
      console.error('[ai/emotions] no tool_use block in response');
      logAudit('ai.emotions', { model: QUESTIONS_MODEL, success: false, error: 'no_tool_use' });
      return NextResponse.json({ error: 'AI hibás választ adott' }, { status: 502 });
    }

    const validated = toolResponseSchema.safeParse(toolUse.input);
    if (!validated.success) {
      console.error('[ai/emotions] tool_use input failed validation', validated.error);
      logAudit('ai.emotions', {
        model: QUESTIONS_MODEL,
        success: false,
        error: 'validation_failed',
      });
      return NextResponse.json({ error: 'AI hibás választ adott' }, { status: 502 });
    }

    logAudit('ai.emotions', {
      model: QUESTIONS_MODEL,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      success: true,
    });
    return NextResponse.json({ emotions: validated.data.emotions });
  } catch (err) {
    console.error('[ai/emotions]', err);
    logAudit('ai.emotions', { model: QUESTIONS_MODEL, success: false, error: 'exception' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

