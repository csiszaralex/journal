import type { Entry } from '../en/entry';

export const entry: Entry = {
  versionLabel: (n) => `v${n}`,

  form: {
    heading: {
      newEntry: 'Új bejegyzés',
      editEntry: 'Bejegyzés szerkesztése',
      newSummary: 'Új összefoglaló',
      editSummary: 'Összefoglaló szerkesztése',
    },

    previousDay: 'Előző nap',
    nextDay: 'Következő nap',

    textPlaceholder: 'Írj szabadon…',

    moodLabel: (forPeriod) => (forPeriod ? 'Hangulat (az időszak egészére)' : 'Hangulat'),
    energyLabel: (forPeriod) => (forPeriod ? 'Energia (az időszak egészére)' : 'Energia'),

    tagsLabel: 'Címkék',
    emotionsLabel: 'Érzelmek',
    aiSuggest: 'AI javaslat',

    draftBanner: 'Nem mentett változtatásaid vannak ehhez a bejegyzéshez.',
    draftBannerOutdated: (draftVersion, currentVersion) =>
      `Nem mentett változtatásaid vannak ehhez a bejegyzéshez. A bejegyzés azóta módosult (v${draftVersion} → v${currentVersion}).`,
    restoreDraft: 'Visszaállítás',
    dismissDraft: 'Elvetés',

    confirmRegenerateAll: 'A meglévő válaszaid elvesznek. Biztos?',
    confirmRegenerateOne: 'A válaszod ehhez a kérdéshez elveszik. Biztos?',

    clearTitle: 'Üríted ezt a bejegyzést?',
    clearDescription: 'Ez minden mezőt kiürít, és eldobja a mentett piszkozatot.',

    addEntry: 'Bejegyzés hozzáadása',
    saveChanges: 'Változtatások mentése',

    savedOffline: 'Offline mentve — szinkronizálunk, amint újra online vagy',
    summaryQueued: 'Az összefoglaló sorban áll — szinkronizálunk, amint újra online vagy',
    summaryQueuedNotice: 'Az összefoglaló sorban áll, és szinkronizálódik, amint újra online leszel.',
    summarySaved: 'Összefoglaló mentve',
  },

  questions: {
    ask: 'Kérdezz tőlem',
    retry: 'Újra',
    regenerateAll: 'Más kérdéseket',
    addOne: '+1 kérdés',
    editQuestion: 'Kérdés szerkesztése',
    replaceQuestion: 'Másik kérdést kérek erre a helyre',
    deleteQuestion: 'Kérdés törlése',
    questionPlaceholder: 'Kérdés szövege…',
    answerPlaceholder: 'Válaszolj röviden, vagy hagyd üresen…',
    deleteTitle: 'Törlöd ezt a kérdést?',
    deleteDescription: 'A beírt válaszod elvész.',
  },

  card: {
    summaryRange: (from, to) => `${from} – ${to}`,
    summaryBadge: 'Összefoglaló',
    backdatedBadge: 'Utólag írt',
    scheduledBadge: 'Jövőbeli',
    versionHistory: 'Verziótörténet',
    readMore: '…tovább',
    reflections: (n) => `Reflexiók (${n})`,
    mood: (score) => `Hangulat ${score}`,
    energy: (score) => `Energia ${score}`,
  },

  today: {
    // Hungarian counts without a plural: "1 nap", "12 nap".
    streak: (days) => `${days} nap`,
  },

  delete: {
    title: 'Törlöd ezt a bejegyzést?',
    description: (dateLabel) => ({
      before: 'A(z) ',
      emphasis: dateLabel,
      after:
        ' bejegyzés eltűnik a naptárból, a keresésből és a statisztikákból. Az alkalmazásból nem hozható vissza.',
    }),
  },

  period: {
    start: 'Időszak kezdete',
    end: 'Időszak vége',
  },

  templates: {
    trigger: 'Sablon',
  },

  pickers: {
    addTag: 'Címke hozzáadása',
    noTags: 'Még nincs címke.',
    addEmotion: 'Érzelem hozzáadása',
    noEmotions: 'Még nincs érzelem.',
    searchPlaceholder: 'Keress vagy hozz létre…',
    empty: 'Még nincs elem.',
    create: (name) => `„${name}” létrehozása`,
    remove: (name) => `${name} eltávolítása`,
    doubleClickToRemove: 'Dupla kattintás az eltávolításhoz',
  },
};
