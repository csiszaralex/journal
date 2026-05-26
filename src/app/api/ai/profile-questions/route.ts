export const dynamic = 'force-dynamic';

import { logAudit } from '@/db/queries/audit';
import { getAnthropicClient, QUESTIONS_MODEL } from '@/lib/ai/anthropic';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  existingQuestions: z.array(z.string().min(1).max(500)).max(20).optional(),
});

const SYSTEM_PROMPT = `You are a helper for a personal daily journal app. The user wants to build a personal context profile so the AI can ask more relevant journal questions in the future.

Your job: generate open-ended questions about the user's life circumstances that, when answered, would help personalize future journal questions. Focus on: occupation/work, family situation, hobbies/interests, home/location, recurring habits or routines.

Hard rules:
1. Do NOT generate questions already present in the existing list (provided below).
2. Each question must be a single sentence. Conversational, not formal.
3. Questions must be open-ended (not yes/no).
4. Generate between 3 and 5 questions.

OUTPUT LANGUAGE: All questions must be written in HUNGARIAN, using the informal/familiar (tegező) form.

Return your questions ONLY via the submit_questions tool. No free text.`;

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
  const { existingQuestions = [] } = parsed.data;

  const userMessage = [
    '## Questions already in profile (do NOT duplicate or paraphrase any of these):',
    existingQuestions.length > 0 ? existingQuestions.map((q) => `- ${q}`).join('\n') : '(none yet)',
    '',
    '## Task',
    "Generate 3 to 5 new questions in Hungarian about this person's life circumstances.",
  ].join('\n');

  lastCallByUser.set(userId, now);

  const toolResponseSchema = z.object({
    questions: z.array(z.string().min(1)).min(3).max(5),
  });

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: QUESTIONS_MODEL,
      max_tokens: 512,
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
          description: 'Submit 3 to 5 life-circumstance questions in Hungarian.',
          input_schema: {
            type: 'object' as const,
            properties: {
              questions: {
                type: 'array',
                items: { type: 'string' },
                minItems: 3,
                maxItems: 5,
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
      console.error('[ai/profile-questions] no tool_use block in response');
      logAudit('ai.profile-questions', {
        model: QUESTIONS_MODEL,
        success: false,
        error: 'no_tool_use',
      });
      return NextResponse.json({ error: 'AI hibás választ adott' }, { status: 502 });
    }

    const validated = toolResponseSchema.safeParse(toolUse.input);
    if (!validated.success) {
      console.error('[ai/profile-questions] tool_use input failed validation', validated.error);
      logAudit('ai.profile-questions', {
        model: QUESTIONS_MODEL,
        success: false,
        error: 'validation_failed',
      });
      return NextResponse.json({ error: 'AI hibás választ adott' }, { status: 502 });
    }

    logAudit('ai.profile-questions', {
      model: QUESTIONS_MODEL,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      success: true,
    });
    return NextResponse.json({ questions: validated.data.questions });
  } catch (err) {
    console.error('[ai/profile-questions]', err);
    logAudit('ai.profile-questions', {
      model: QUESTIONS_MODEL,
      success: false,
      error: 'exception',
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

