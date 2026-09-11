export const dynamic = 'force-dynamic';

import { logAudit } from '@/db/queries/audit';
import { listEntries, type EntryKind } from '@/db/queries/entries';
import { listIntentionsForPeriod } from '@/db/queries/intentions';
import { getProfileBio, listProfileQa } from '@/db/queries/profile';
import { getAiHistoryEntries, getSummaryGapDays } from '@/db/queries/settings';
import { getAnthropicClient, QUESTIONS_MODEL } from '@/lib/ai/anthropic';
import { PROMPT_LANGUAGE, type PromptLanguage } from '@/lib/ai/prompt-language';
import type { Locale } from '@/i18n/locales';
import { getDict, getLocale } from '@/i18n/request';
import { withSession } from '@/lib/api-route';
import { limitAi } from '@/lib/rate-limit';
import { todayInAppTZ } from '@/lib/date';
import { SUMMARY_HISTORY_ENTRIES } from '@/lib/summary-config';
import { format, subDays } from 'date-fns';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  todayText: z.string().max(4000).optional(),
  count: z.number().int().min(1).max(5).optional(),
  existingQuestions: z.array(z.string().min(1).max(500)).max(10).optional(),
  referenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  mode: z.enum(['daily', 'summary']).optional(),
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** The few-shot examples as rule 1 renders them: `"…", "…", "…"`. */
function quoted(examples: readonly string[]): string {
  return examples.map((q) => `"${q}"`).join(', ');
}

/**
 * The system prompt in one language.
 *
 * The instructions stay English in both languages on purpose — they are prompt
 * engineering, not copy anyone reads. What is interpolated is the language the
 * model must answer in and the few-shot questions, which have to be written in
 * that same language or they demonstrate the wrong thing. See
 * `@/lib/ai/prompt-language`.
 */
function buildSystemPrompt(lang: PromptLanguage): string {
  return `You are an assistant for a daily reflective journal. The user is currently writing today's entry and wants follow-up questions that help them describe today more accurately and notice things they might otherwise gloss over.

You receive:
- The past few days of journal entries with their tags (topic labels) and emotions (how the user felt)
- Optionally, what the user has already written for today
- Optionally, questions they have already received and want to keep — you MUST NOT duplicate or paraphrase these

Your job: generate N open-ended questions that pull on specific threads from the past entries.

Hard rules — these are strictly enforced:
1. Each question must reference a SPECIFIC concrete detail from the past entries: a plan that was mentioned, a worry that was expressed, a person or activity named, a recurring tag/theme. Generic catch-all questions are forbidden. Examples of BAD questions (do not produce these or anything like them): ${quoted(lang.questions.badExamples)}. Examples of GOOD questions: ${quoted(lang.questions.goodExamples)}
2. Open-ended only. No yes/no questions, no questions answerable with a single word.
3. Maximum 1 sentence per question. Conversational, not formal.
4. Do not ask about content the user has already written for today.
5. If existing questions are provided, your new questions must explore SUBSTANTIVELY different topics or angles. No paraphrasing of the existing ones.
6. If two past days mention the same thread (e.g. a recurring worry, an unfinished task) or share an emotional thread (e.g. recurring frustration, sustained tiredness), prefer asking about the continuation/resolution of it.

${lang.questions.outputRule}

Return your questions ONLY via the \`submit_questions\` tool. Do not produce any free text.`;
}

/**
 * Both languages, built once at module load rather than per request.
 *
 * The block goes out under `cache_control`, and a cached prefix is a byte
 * match: rebuilding the string per request would be fine as long as it is
 * identical, but building it once makes that impossible to get wrong later.
 * Each language is its own prefix and so its own cache entry, which costs
 * nothing in practice — a request is served in one language, and a given
 * install almost always stays in one.
 *
 * Worth knowing before reasoning about any of this: nothing is cached today.
 * The model's minimum cacheable prefix is 1024 tokens and all three of these
 * prompts are well under it (this one, the longest, is around 540), so the
 * `cache_control` below is accepted, writes nothing, and reports zero created
 * tokens rather than an error. It is kept because it costs nothing and becomes
 * correct the moment the prompt grows past the minimum — but do not read a
 * cache hit into it as things stand.
 */
const SYSTEM_PROMPT: Record<Locale, string> = {
  en: buildSystemPrompt(PROMPT_LANGUAGE.en),
  hu: buildSystemPrompt(PROMPT_LANGUAGE.hu),
};


function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + 'T00:00:00');
  const to = new Date(toISO + 'T00:00:00');
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function ageLabel(entryDate: string, referenceDate: string): string {
  const days = daysBetween(entryDate, referenceDate);
  if (days <= 0) return 'same day';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

type PriorDay = {
  entry_date: string;
  kind: EntryKind;
  period_start: string | null;
  text: string;
  tagNames: string[];
  emotionNames: string[];
  qaPairs: { question: string; answer: string }[];
};

/**
 * The dated header of one prior entry. A summary is a range, not a day —
 * rendering it as `### 2026-08-18 — yesterday` would present a 48-day recap as
 * a single day, exactly the confusion this feature exists to remove. Summaries
 * are labelled, never filtered out: the recap IS the record of the gap.
 * The daily form is unchanged.
 */
function entryHeading(d: Pick<PriorDay, 'entry_date' | 'kind' | 'period_start'>, referenceDate: string): string {
  if (d.kind === 'summary' && d.period_start) {
    const spanDays = daysBetween(d.period_start, d.entry_date) + 1;
    // Aged by the END date: that is when the period closed.
    return `${d.period_start} – ${d.entry_date} — recap of ${spanDays} days, ending ${ageLabel(d.entry_date, referenceDate)}`;
  }
  return `${d.entry_date} — ${ageLabel(d.entry_date, referenceDate)}`;
}

function buildUserMessage(
  referenceDate: string,
  priorDays: PriorDay[],
  todayText: string | undefined,
  existingQuestions: string[] | undefined,
  count: number,
  gapThreshold: number,
  summary: {
    periodStart: string;
    periodEnd: string;
    intentions: { text: string; status: string; due_date: string | null }[];
  } | null,
  lang: PromptLanguage,
): string {
  const priorSection =
    priorDays.length === 0
      ? '(no prior entries)'
      : priorDays
          .map((d) => {
            const tagLabels = d.tagNames.length > 0 ? d.tagNames.join(', ') : 'none';
            const emotionLabels = d.emotionNames.length > 0 ? d.emotionNames.join(', ') : 'none';
            const qaSection =
              d.qaPairs.length > 0
                ? '\n\nQ&A from this day:\n' +
                  d.qaPairs.map((p) => `- Q: ${p.question}\n  A: ${p.answer}`).join('\n')
                : '';
            const body = d.text.trim().length > 0 ? d.text : '(no free text — only the Q&A below)';
            return `### ${entryHeading(d, referenceDate)} (tags: ${tagLabels} | emotions: ${emotionLabels})\n${body}${qaSection}`;
          })
          .join('\n\n');

  const todaySection = todayText && todayText.trim().length > 0 ? todayText : '(empty so far)';

  const existingSection =
    existingQuestions && existingQuestions.length > 0
      ? `\n\n## Questions already shown to the user (do NOT duplicate or paraphrase any of these):\n${existingQuestions.map((q) => `- ${q}`).join('\n')}`
      : '';

  const newestPriorDate = priorDays.length > 0 ? priorDays[priorDays.length - 1].entry_date : null;
  const gapDays = newestPriorDate ? daysBetween(newestPriorDate, referenceDate) : null;

  // The summary block already carries the "user has been away" framing, so
  // the two must never render together — they would contradict each other in tone.
  const gapSection =
    !summary && gapDays !== null && gapDays >= gapThreshold
      ? `\n\n## Important — the user has been away\nThe most recent entry above is ${gapDays} days old. Do NOT ask about day-to-day continuations as if they just happened. Ask what became of the threads left open back then, and what filled the silence since. Anchor each question in a specific detail from those older entries, but phrase it across the elapsed time.`
      : '';

  // The summary block covers the no-history case with its own instruction
  // below, and the two must never render together — "ask orienting questions
  // about today" directly contradicts "never ask about today".
  const noHistorySection =
    !summary && priorDays.length === 0
      ? `\n\n## Important — no prior entries\nThis is the user's first entry, so rule 1 cannot be satisfied from past entries. Use the user context block above instead (bio and known facts), and ask orienting questions about today. Still no generic filler like "How are you feeling?".`
      : '';

  const summarySection = summary
    ? `\n\n## What the user is writing now\nThis is NOT a single day. The user is writing one recap covering ${summary.periodStart} to ${summary.periodEnd} (${daysBetween(summary.periodStart, summary.periodEnd) + 1} days), a period they did not journal at all. The entries above are from BEFORE that period.\n\nAsk about the period as a whole: what became of the threads left open before it, what changed across it, what stands out in hindsight. Never ask about "today" — there is no single day here.${
        summary.intentions.length > 0
          ? `\n\nIntentions that were live during this period — good material for "what came of it?" questions:\n${summary.intentions
              .map((i) => `- ${i.text} (status: ${i.status}${i.due_date ? `, due: ${i.due_date}` : ''})`)
              .join('\n')}`
          : ''
      }${
        priorDays.length === 0
          ? `\n\nThere are no earlier entries to draw on here, so rule 1 cannot be satisfied from history. Use the user context block above instead (bio and known facts), and ask about the period itself. Still no generic filler.`
          : ''
      }`
    : '';

  return `## Today: ${referenceDate}\n\n## Previous days:\n\n${priorSection}\n\n## Today's draft (not yet saved):\n${todaySection}${existingSection}${gapSection}${noHistorySection}${summarySection}\n\n## Task\n${lang.questions.taskLine(count)}`;
}

function buildProfileContext(
  bio: string,
  qaItems: { question: string; answer: string | null }[],
): string | null {
  const answered = qaItems.filter((q) => q.answer && q.answer.trim().length > 0);
  if (!bio.trim() && answered.length === 0) return null;

  const lines: string[] = [
    '[User context — use this to personalize questions and avoid asking things already known]',
  ];
  if (bio.trim()) lines.push(`Bio: "${bio.trim()}"`);
  if (answered.length > 0) {
    lines.push('Known facts:');
    answered.forEach((q) => lines.push(`- Q: ${q.question} / A: ${q.answer}`));
  }
  return lines.join('\n');
}

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
  const mode = parsed.data.mode ?? 'daily';
  if (mode === 'summary' && !parsed.data.periodStart) {
    return NextResponse.json({ error: d.errors.api.invalidRequestBody }, { status: 400 });
  }
  const { todayText, existingQuestions } = parsed.data;
  const count = parsed.data.count ?? 3;

  const toolResponseSchema = z.object({
    questions: z.array(z.string().min(1)).length(count),
  });

  // The date being written — not necessarily today, since the form supports
  // backdating. Everything (filtering, ages, gap detection) is relative to it.
  const referenceDate = parsed.data.referenceDate ?? todayInAppTZ();

  // How many prior entries to feed the AI (configurable in Settings).
  const historyEntries = getAiHistoryEntries();
  // The gap threshold that also drives the home-page banner (single knob).
  const gapThreshold = getSummaryGapDays();
  const periodStart = parsed.data.periodStart;
  // Over-fetch so the reference day + entries with nothing written can be filtered
  // out before slicing.
  // In summary mode the period itself is empty by definition, so the window
  // comes from the entries strictly BEFORE periodStart, not around referenceDate.
  const recent =
    mode === 'summary' && periodStart
      ? listEntries({
          to_date: format(subDays(new Date(periodStart + 'T00:00:00'), 1), 'yyyy-MM-dd'),
          page_size: SUMMARY_HISTORY_ENTRIES + 7,
        })
      : listEntries({ to_date: referenceDate, page_size: historyEntries + 7 });
  const windowSize = mode === 'summary' ? SUMMARY_HISTORY_ENTRIES : historyEntries;
  const priorDays = recent
    // Drop the entry currently being written — a DAILY one shares its date with
    // the reference date. A summary ending on that date is a different entry
    // covering a whole range, and it is the most relevant context there is when
    // the user backfills the last day of a gap it recaps, so it stays (labelled
    // as a range by entryHeading, the way this route treats every summary).
    .filter((e) => e.version.kind === 'summary' || e.version.entry_date !== referenceDate)
    // A day is worth showing if the user wrote anything at all — free text or an
    // answer to an earlier question. Dropping answer-only days would hide exactly
    // the material these prompts produced.
    .filter(
      (e) =>
        e.version.text.trim().length > 0 ||
        e.version.qa_pairs.some((p) => p.answer.trim().length > 0),
    )
    .slice(0, windowSize)
    // Show oldest → newest in the prompt for natural reading order.
    .reverse()
    .map((e) => ({
      entry_date: e.version.entry_date,
      // Carried so the prompt can render a summary as the range it is.
      kind: e.version.kind,
      period_start: e.version.period_start,
      text: e.version.text,
      tagNames: e.version.tags.map((t) => t.display_name),
      emotionNames: e.version.emotions.map((em) => em.display_name),
      qaPairs: e.version.qa_pairs
        .filter((p) => p.answer.trim().length > 0)
        .map((p) => ({ question: p.question, answer: p.answer })),
    }));

  const bio = getProfileBio();
  const profileQa = listProfileQa();
  const profileContext = buildProfileContext(bio, profileQa);

  const summaryContext =
    mode === 'summary' && periodStart
      ? {
          periodStart,
          periodEnd: referenceDate,
          intentions: listIntentionsForPeriod(periodStart, referenceDate).map((i) => ({
            text: i.text,
            status: i.status,
            due_date: i.due_date,
          })),
        }
      : null;

  const baseUserMessage = buildUserMessage(
    referenceDate,
    priorDays,
    todayText,
    existingQuestions,
    count,
    gapThreshold,
    summaryContext,
    lang,
  );
  const userMessage = profileContext ? `${profileContext}\n\n${baseUserMessage}` : baseUserMessage;

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: QUESTIONS_MODEL,
      max_tokens: 1024,
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
          description: lang.questions.toolDescription,
          input_schema: {
            type: 'object' as const,
            properties: {
              questions: {
                type: 'array',
                items: { type: 'string' },
                minItems: count,
                maxItems: count,
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
      logAudit('ai.questions', { model: QUESTIONS_MODEL, mode, success: false, error: 'no_tool_use' });
      return NextResponse.json({ error: d.errors.api.aiBadResponse }, { status: 502 });
    }

    const validated = toolResponseSchema.safeParse(toolUse.input);
    if (!validated.success) {
      console.error('[ai/questions] tool_use input failed validation', validated.error);
      logAudit('ai.questions', {
        model: QUESTIONS_MODEL,
        mode,
        success: false,
        error: 'validation_failed',
      });
      return NextResponse.json({ error: d.errors.api.aiBadResponse }, { status: 502 });
    }

    logAudit('ai.questions', {
      model: QUESTIONS_MODEL,
      mode,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      count,
      success: true,
    });
    return NextResponse.json({ questions: validated.data.questions });
  } catch (err) {
    console.error('[ai/questions]', err);
    logAudit('ai.questions', { model: QUESTIONS_MODEL, mode, success: false, error: 'exception' });
    return NextResponse.json({ error: d.errors.api.internalError }, { status: 500 });
  }
}, { limit: limitAi, limitMessage: (d) => d.errors.api.tooFast });

