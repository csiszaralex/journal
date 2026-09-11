export const dynamic = 'force-dynamic';

import { logAudit } from '@/db/queries/audit';
import { getPopularEmotions } from '@/db/queries/emotions';
import { getAnthropicClient, QUESTIONS_MODEL } from '@/lib/ai/anthropic';
import { PROMPT_LANGUAGE, type PromptLanguage } from '@/lib/ai/prompt-language';
import type { Locale } from '@/i18n/locales';
import { getDict, getLocale } from '@/i18n/request';
import { withSession } from '@/lib/api-route';
import { limitAi } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  currentEmotions: z.array(z.string().min(1).max(200)).max(50).optional(),
  entryContent: z.string().max(4000).optional(),
});

/**
 * The system prompt in one language.
 *
 * The instructions stay English in both — they are prompt engineering, not
 * copy anyone reads. What follows the locale is the vocabulary guidance under
 * rule 3, which is about the grammar of the language the emotion words are
 * written in, and the output-language rule, which stays *soft* here: unlike
 * the two question routes, this one asks the model to match whatever language
 * the user is actually writing in, and the app's language only decides which
 * way to fall when the entry does not say. See `@/lib/ai/prompt-language`.
 */
function buildSystemPrompt(lang: PromptLanguage): string {
  return `You are an assistant for a daily reflective journal. The user is writing a journal entry and wants suggestions for emotions that match their current state.

You receive:
- The top 50 most-used emotions in the journal (for reference, not as a constraint)
- The user's current emotions for this entry
- Optionally, what the user has written so far today

Your job: suggest up to 3 emotions that fit the entry's mood and context.

Rules:
1. You MAY suggest emotions from the existing list, or entirely new emotions not on the list.
2. Never suggest an emotion the user has already selected for this entry.
3. Each suggestion MUST name a feeling or emotional state, expressed as a NOUN or an ADJECTIVE — never a verb. Match the grammatical form of the existing emotions list above.
${lang.emotions.vocabularyRules}
4. Keep emotion names short: 1-3 words maximum, lowercase.
5. Suggest emotions that are specific and meaningful, not generic catch-alls like "happy" or "sad" unless contextually appropriate.
6. If the entry content is empty, base suggestions on the current emotions already selected.

${lang.emotions.outputRule}

Return your suggestions ONLY via the \`submit_emotions\` tool. Do not produce any free text.`;
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
  // The language the model falls back to when the entry itself does not say
  // which one it is in, resolved once for the whole request.
  const locale = await getLocale();
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
          text: SYSTEM_PROMPT[locale],
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
      return NextResponse.json({ error: d.errors.api.aiBadResponse }, { status: 502 });
    }

    const validated = toolResponseSchema.safeParse(toolUse.input);
    if (!validated.success) {
      console.error('[ai/emotions] tool_use input failed validation', validated.error);
      logAudit('ai.emotions', {
        model: QUESTIONS_MODEL,
        success: false,
        error: 'validation_failed',
      });
      return NextResponse.json({ error: d.errors.api.aiBadResponse }, { status: 502 });
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
    return NextResponse.json({ error: d.errors.api.internalError }, { status: 500 });
  }
}, { limit: limitAi, limitMessage: (d) => d.errors.api.tooFast });

