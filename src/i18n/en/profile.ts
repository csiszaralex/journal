/**
 * The "About me" settings page: the free-text bio the AI is given as context,
 * and the list of profile questions it asks alongside it.
 *
 * Words shared with the rest of the app — the "Saved" toast, the generating
 * state of the button, the network and unexpected errors, and the cancel and
 * delete buttons in the dialog — are NOT here. They live in `common`.
 */
export const profile = {
  /** The page heading. Separate from `settings.cards.profile`, the label on the
   *  card that opens it: the card names a section, this addresses the reader. */
  title: 'About me',

  /** The line under the heading, saying what any of this is for. */
  intro:
    'Write down whatever helps the journal ask you questions that fit — your work, your family, your hobbies, the habits you keep.',

  /** The free-text half. */
  bio: {
    heading: 'Free description',
    /** An example, not a rule. Each language writes one that sounds like
     *  someone from that language talking about themselves. */
    placeholder: 'E.g. I run a restaurant, I have two children, I go running regularly…',
  },

  /** The generated questions and the answers typed under them. */
  qa: {
    heading: 'Questions and answers',
    /** Shorter than `entry.questions.answerPlaceholder` on purpose: these
     *  answers are notes about a life, not a reflection on a day. */
    answerPlaceholder: 'Answer briefly…',
    /** Asks the AI for more questions. Its busy state is `common.generating`;
     *  only the idle label is here, because it names what is generated. */
    generate: 'Generate questions',

    // Removing a question is `common.deleteQuestion*` — the same dialog the
    // entry form shows over its own questions, so it is written once.
  },
};

export type Profile = typeof profile;
