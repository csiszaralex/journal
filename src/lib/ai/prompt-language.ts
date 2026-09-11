// The language-dependent pieces of the three AI prompts (`/api/ai/questions`,
// `/api/ai/profile-questions`, `/api/ai/emotions`). Kept free of server/DB
// imports so it stays a plain data module, like `history-config.ts` next to it.

import type { Locale } from '@/i18n/locales';

/**
 * ## Why this is not in `src/i18n`
 *
 * The dictionary is interface copy, and every area of it compiles into the
 * *client* bundle (see the comment in `src/i18n/dictionary.ts`). None of the
 * text below is ever rendered: it only ever leaves the server inside an
 * Anthropic request from a route handler, so in the dictionary it would be
 * dead weight shipped to every browser. It lives here, keyed by the same
 * `Locale`, so the parity discipline is the same — `Record<Locale, …>` makes a
 * field missing from either language a compile error.
 *
 * ## What is translated and what is not
 *
 * Only what the *model writes* follows the locale. The instructions addressed
 * to the model stay in English in the route files — they are prompt
 * engineering, not user-visible copy, and English is what they are tuned in.
 * So the section headers, the `(none yet)` / `(empty so far)` placeholders,
 * the `same day` / `yesterday` age labels and the summary framing are all
 * English in both languages; what varies is the output-language rule, the
 * few-shot examples (which have to be written in the language being asked
 * for, or they teach the wrong thing), the task line, the tool descriptions,
 * and the emotion vocabulary guidance, which is about the grammar of the
 * target language.
 *
 * Each rule is written out in full per language rather than generated from one
 * template with a language name interpolated into it. The Hungarian rules are
 * not the English ones plus a word: Hungarian has a T/V distinction and these
 * prompts have always demanded the informal *tegező* form, which English has
 * no equivalent of. They are different sentences, so they are stored as
 * different sentences.
 *
 * ## Switching the language does not retranslate anything already stored
 *
 * The questions in `entry_qa_pairs` and `user_profile_qa`, and the emotion
 * names in `emotions`, keep whatever language they were generated in. Someone
 * who journals in Hungarian for a year and then switches the app to English
 * keeps a year of Hungarian questions and Hungarian emotion names, and the
 * entry, history, search and stats views go on showing them. That is correct:
 * those rows are the journal's *content*, written with the user, and
 * rewriting them would be editing the record — unlike the interface, which is
 * only ever a rendering of it. Only text generated after the switch comes back
 * in the new language, and the prior entries fed back to the model as context
 * stay mixed for as long as the history window reaches across the switch.
 */
export type PromptLanguage = {
  questions: {
    /** The `OUTPUT LANGUAGE:` directive of the questions system prompt. */
    outputRule: string;
    /**
     * Few-shot questions for rule 1, which is about *specificity*: each one
     * names a person, a plan or a deadline the entries mentioned. They are
     * quoted and joined by the route.
     *
     * They must also satisfy rule 2 — open-ended, no yes/no. An example is a
     * stronger signal to a model than a rule it contradicts, so a yes/no
     * example here quietly repeals rule 2 however firmly it is worded. These
     * were yes/no-shaped in both languages until the two were reconciled.
     */
    goodExamples: readonly string[];
    /** The generic filler rule 1 forbids — the counter-examples to the above. */
    badExamples: readonly string[];
    /** The `## Task` line closing the user message. */
    taskLine: (count: number) => string;
    /**
     * The `submit_questions` tool description.
     *
     * It deliberately does not state how many questions to submit, though the
     * sentence it replaced did. The count is already enforced twice — by
     * `minItems`/`maxItems` on the tool's own schema, and by the task line in
     * the user message — while tools are the first thing in the cached prefix,
     * so naming it here made that prefix a different one for every count.
     */
    toolDescription: string;
  };
  profileQuestions: {
    /** The `OUTPUT LANGUAGE:` directive of the profile system prompt. */
    outputRule: string;
    /** The `## Task` line closing the user message. */
    taskLine: string;
    /** The `submit_questions` tool description. */
    toolDescription: string;
  };
  emotions: {
    /**
     * The `OUTPUT LANGUAGE:` directive of the emotions system prompt. Soft by
     * design, and it stays soft: the model is told to match the language the
     * user is actually writing in, and the app's language only decides which
     * way to fall when that is not clear from the entry.
     */
    outputRule: string;
    /**
     * The three bullets under rule 3 — example nouns, example adjectives, and
     * the mapping that turns a non-noun into a feeling word. Indented to sit
     * under rule 3 and interpolated as one block.
     *
     * The mapping is not the same rule in both languages. Hungarian speakers
     * write emotions as verbs ("aggódik"), so the Hungarian bullet converts
     * verbs; English speakers reach for adjectives and gerunds ("anxious",
     * "worrying"), so the English one converts those.
     */
    vocabularyRules: string;
    /**
     * The catch-alls rule 5 warns against, already quoted and joined. They are
     * example *outputs*, so they have to be in the language being asked for —
     * telling a model to avoid "happy" while demanding Hungarian names nothing
     * it could actually return.
     */
    genericExamples: string;
  };
};

export const PROMPT_LANGUAGE: Record<Locale, PromptLanguage> = {
  en: {
    questions: {
      outputRule:
        'OUTPUT LANGUAGE: All questions must be written in ENGLISH. Address the user directly as "you", in the casual register a friend would use — never the register of a form or an interviewer.',
      goodExamples: [
        'What came of the conversation with Anna you were putting off yesterday?',
        'What happened with the workout you skipped yesterday?',
        "What moved on the Friday deadline today, and what didn't?",
      ],
      badExamples: [
        'How are you feeling today?',
        'What did you accomplish?',
        "What's on your mind?",
        'What was the best part of your day?',
      ],
      taskLine: (count) =>
        `Generate exactly ${count} new question${count === 1 ? '' : 's'} in English, following all the rules in the system prompt.`,
      toolDescription: 'Submit the reflective questions in English.',
    },
    profileQuestions: {
      outputRule:
        'OUTPUT LANGUAGE: All questions must be written in ENGLISH. Address the user directly as "you", in a casual, everyday register.',
      taskLine: "Generate 3 to 5 new questions in English about this person's life circumstances.",
      toolDescription: 'Submit 3 to 5 life-circumstance questions in English.',
    },
    emotions: {
      outputRule:
        'OUTPUT LANGUAGE: Emotion names must match the language the user is writing in (detected from entry content or existing emotions). If the journal is in English, return English emotion words. If Hungarian, return Hungarian. Default to English if uncertain.',
      vocabularyRules: `   - Good English nouns: "joy", "anxiety", "gratitude", "disappointment", "calm", "pride".
   - Good English adjectives: "tired", "restless", "content", "lonely", "tense", "grateful".
   - NEVER return a verb or a gerund. Convert it to its feeling form: "worrying" → "worry", "dreading" → "dread", "resenting" → "resentment", "hoping" → "hope", "raging" → "anger", "grieving" → "grief". Where an adjective has a natural noun form, prefer the noun: "anxious" → "anxiety", "disappointed" → "disappointment", "proud" → "pride".`,
      genericExamples: '"happy" or "sad"',
    },
  },
  hu: {
    questions: {
      outputRule:
        'OUTPUT LANGUAGE: All questions must be written in HUNGARIAN, using the informal/familiar (tegező) form. The questions themselves must be Hungarian even though these instructions are in English.',
      goodExamples: [
        'Mi lett azzal a beszélgetéssel Annával, amit tegnap halogattál?',
        'Mi lett ma az edzéssel, amit tegnap kihagytál?',
        'Mi haladt ma a pénteki határidővel, és mi nem?',
      ],
      badExamples: [
        'Hogy érzed magad ma?',
        'Mit sikerült ma elérned?',
        'Mi jár a fejedben?',
        'Mi volt a mai napod legjobb része?',
      ],
      taskLine: (count) =>
        `Generate exactly ${count} new question${count === 1 ? '' : 's'} in Hungarian, following all the rules in the system prompt.`,
      toolDescription: 'Submit the reflective questions in Hungarian.',
    },
    profileQuestions: {
      outputRule:
        'OUTPUT LANGUAGE: All questions must be written in HUNGARIAN, using the informal/familiar (tegező) form.',
      taskLine:
        "Generate 3 to 5 new questions in Hungarian about this person's life circumstances.",
      toolDescription: 'Submit 3 to 5 life-circumstance questions in Hungarian.',
    },
    emotions: {
      outputRule:
        'OUTPUT LANGUAGE: Emotion names must match the language the user is writing in (detected from entry content or existing emotions). If the journal is in Hungarian, return Hungarian emotion words. If English, return English. Default to Hungarian if uncertain.',
      vocabularyRules: `   - Good Hungarian nouns: "öröm", "szorongás", "hála", "csalódottság", "nyugalom", "büszkeség".
   - Good Hungarian adjectives: "fáradt", "ideges", "elégedett", "magányos", "feszült", "hálás".
   - NEVER return a verb. Convert any verb to its feeling form: "aggódik" → "aggodalom", "fél" → "félelem", "örül" → "öröm", "dühöng" → "düh", "csalódik" → "csalódottság", "remél" → "remény".`,
      genericExamples: '"boldog" vagy "szomorú"',
    },
  },
};
