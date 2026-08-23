export const dynamic = 'force-dynamic';

import { logAudit } from '@/db/queries/audit';
import { listEntries, type EntryKind } from '@/db/queries/entries';
import { listIntentionsForPeriod } from '@/db/queries/intentions';
import { getProfileBio, listProfileQa } from '@/db/queries/profile';
import { getAiHistoryDays, getSummaryGapDays } from '@/db/queries/settings';
import { getAnthropicClient, QUESTIONS_MODEL } from '@/lib/ai/anthropic';
import { auth } from '@/lib/auth';
import { SUMMARY_HISTORY_ENTRIES } from '@/lib/summary-config';
import { format, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { NextRequest, NextResponse } from 'next/server';
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

const SYSTEM_PROMPT = `You are an assistant for a daily reflective journal. The user is currently writing today's entry and wants follow-up questions that help them describe today more accurately and notice things they might otherwise gloss over.

You receive:
- The past few days of journal entries with their tags (topic labels) and emotions (how the user felt)
- Optionally, what the user has already written for today
- Optionally, questions they have already received and want to keep — you MUST NOT duplicate or paraphrase these

Your job: generate N open-ended questions that pull on specific threads from the past entries.

Hard rules — these are strictly enforced:
1. Each question must reference a SPECIFIC concrete detail from the past entries: a plan that was mentioned, a worry that was expressed, a person or activity named, a recurring tag/theme. Generic catch-all questions are forbidden. Examples of BAD questions (do not produce these or anything like them): "How are you feeling today?", "What did you accomplish?", "What's on your mind?", "What was the best part of your day?". Examples of GOOD questions: "Sikerült ma beszélned Annával arról a témáról, amit tegnap halogattál?", "Eljutottál ma az edzésre, vagy megint kimaradt?", "A pénteki határidőhöz közelebb kerültél valamit?"
2. Open-ended only. No yes/no questions, no questions answerable with a single word.
3. Maximum 1 sentence per question. Conversational, not formal.
4. Do not ask about content the user has already written for today.
5. If existing questions are provided, your new questions must explore SUBSTANTIVELY different topics or angles. No paraphrasing of the existing ones.
6. If two past days mention the same thread (e.g. a recurring worry, an unfinished task) or share an emotional thread (e.g. recurring frustration, sustained tiredness), prefer asking about the continuation/resolution of it.

OUTPUT LANGUAGE: All questions must be written in HUNGARIAN, using the informal/familiar (tegező) form. The questions themselves must be Hungarian even though these instructions are in English.

Return your questions ONLY via the \`submit_questions\` tool. Do not produce any free text.`;

const RATE_LIMIT_MS = 5000;
const lastCallByUser = new Map<string, number>();

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
            return `### ${entryHeading(d, referenceDate)} (tags: ${tagLabels} | emotions: ${emotionLabels})\n${d.text}${qaSection}`;
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

  return `## Today: ${referenceDate}\n\n## Previous days:\n\n${priorSection}\n\n## Today's draft (not yet saved):\n${todaySection}${existingSection}${gapSection}${noHistorySection}${summarySection}\n\n## Task\nGenerate exactly ${count} new question${count === 1 ? '' : 's'} in Hungarian, following all the rules in the system prompt.`;
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
  const mode = parsed.data.mode ?? 'daily';
  if (mode === 'summary' && !parsed.data.periodStart) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { todayText, existingQuestions } = parsed.data;
  const count = parsed.data.count ?? 3;

  const toolResponseSchema = z.object({
    questions: z.array(z.string().min(1)).length(count),
  });

  // The date being written — not necessarily today, since the form supports
  // backdating. Everything (filtering, ages, gap detection) is relative to it.
  const appToday = formatInTimeZone(new Date(), 'Europe/Budapest', 'yyyy-MM-dd');
  const referenceDate = parsed.data.referenceDate ?? appToday;

  // How many prior entries to feed the AI (configurable in Settings).
  const historyDays = getAiHistoryDays();
  // The gap threshold that also drives the home-page banner (single knob).
  const gapThreshold = getSummaryGapDays();
  const periodStart = parsed.data.periodStart;
  // Over-fetch so the reference day + empty-text entries can be filtered out before slicing.
  // In summary mode the period itself is empty by definition, so the window
  // comes from the entries strictly BEFORE periodStart, not around referenceDate.
  const recent =
    mode === 'summary' && periodStart
      ? listEntries({
          to_date: format(subDays(new Date(periodStart + 'T00:00:00'), 1), 'yyyy-MM-dd'),
          page_size: SUMMARY_HISTORY_ENTRIES + 7,
        })
      : listEntries({ to_date: referenceDate, page_size: historyDays + 7 });
  const windowSize = mode === 'summary' ? SUMMARY_HISTORY_ENTRIES : historyDays;
  const priorDays = recent
    // Drop the entry currently being written — a DAILY one shares its date with
    // the reference date. A summary ending on that date is a different entry
    // covering a whole range, and it is the most relevant context there is when
    // the user backfills the last day of a gap it recaps, so it stays (labelled
    // as a range by entryHeading, the way this route treats every summary).
    .filter((e) => e.version.kind === 'summary' || e.version.entry_date !== referenceDate)
    .filter((e) => e.version.text.trim().length > 0)
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
  );
  const userMessage = profileContext ? `${profileContext}\n\n${baseUserMessage}` : baseUserMessage;

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
          description: `Submit exactly ${count} reflective question${count === 1 ? '' : 's'} in Hungarian.`,
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
      return NextResponse.json({ error: 'AI hibás választ adott' }, { status: 502 });
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
      return NextResponse.json({ error: 'AI hibás választ adott' }, { status: 502 });
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
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

