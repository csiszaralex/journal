export const dynamic = 'force-dynamic';

import { logAudit } from '@/db/queries/audit';
import { getAnthropicClient, QUESTIONS_MODEL } from '@/lib/ai/anthropic';
import { PROMPT_LANGUAGE, type PromptLanguage } from '@/lib/ai/prompt-language';
import type { Locale } from '@/i18n/locales';
import { getDict, getLocale } from '@/i18n/request';
import { withSession } from '@/lib/api-route';
import { limitAi } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  existingQuestions: z.array(z.string().min(1).max(500)).max(20).optional(),
});

/**
 * The system prompt in one language. The instructions stay English in both —
 * they are prompt engineering, not copy anyone reads; only the language the
 * model must answer in follows the locale. See `@/lib/ai/prompt-language`.
 */
function buildSystemPrompt(lang: PromptLanguage): string {
  return `You are a helper for a personal daily journal app. The user wants to build a personal context profile so the AI can ask more relevant journal questions in the future.

Your job: generate open-ended questions about the user's life circumstances that, when answered, would help personalize future journal questions. Focus on: occupation/work, family situation, hobbies/interests, home/location, recurring habits or routines.

Hard rules:
1. Do NOT generate questions already present in the existing list (provided below).
2. Each question must be a single sentence. Conversational, not formal.
3. Questions must be open-ended (not yes/no).
4. Generate between 3 and 5 questions.

${lang.profileQuestions.outputRule}

Return your questions ONLY via the submit_questions tool. No free text.`;
}

/**
 * Both languages, built once at module load rather than per request: the block
 * goes out under `cache_control`, and a cached prefix is a byte match. Each
 * language is its own prefix and so its own cache entry, which costs nothing
 * in practice — a request is served in one language.
 */
const SYSTEM_PROMPT: Record<Locale, string> = {
  en: buildSystemPrompt(PROMPT_LANGUAGE.en),
  hu: buildSystemPrompt(PROMPT_LANGUAGE.hu),
};


export const POST = withSession(async (req) => {
  const d = await getDict();
  // The language the model must answer in, resolved once for the whole
  // request: the same setting that decides the interface language.
  const locale = await getLocale();
  const lang = PROMPT_LANGUAGE[locale];
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    rawBody = {};
  }
  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: d.errors.api.invalidRequestBody }, { status: 400 });
  }
  const { existingQuestions = [] } = parsed.data;

  const userMessage = [
    '## Questions already in profile (do NOT duplicate or paraphrase any of these):',
    existingQuestions.length > 0 ? existingQuestions.map((q) => `- ${q}`).join('\n') : '(none yet)',
    '',
    '## Task',
    lang.profileQuestions.taskLine,
  ].join('\n');

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
          text: SYSTEM_PROMPT[locale],
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [
        {
          name: 'submit_questions',
          description: lang.profileQuestions.toolDescription,
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
      return NextResponse.json({ error: d.errors.api.aiBadResponse }, { status: 502 });
    }

    const validated = toolResponseSchema.safeParse(toolUse.input);
    if (!validated.success) {
      console.error('[ai/profile-questions] tool_use input failed validation', validated.error);
      logAudit('ai.profile-questions', {
        model: QUESTIONS_MODEL,
        success: false,
        error: 'validation_failed',
      });
      return NextResponse.json({ error: d.errors.api.aiBadResponse }, { status: 502 });
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
    return NextResponse.json({ error: d.errors.api.internalError }, { status: 500 });
  }
}, { limit: limitAi, limitMessage: (d) => d.errors.api.tooFast });

