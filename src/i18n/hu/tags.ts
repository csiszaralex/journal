import type { Tags } from '../en/tags';

export const tags: Tags = {
  title: 'Címkék és érzelmek',

  intro:
    'Szerkesztheted a megjelenített nevet, a normalizált (összevonáshoz használt) nevet és a színt. A normalizált név határozza meg, hogy két beírás ugyanazt a címkét jelenti-e — ha „boldog”-ra állítod, akkor a később beírt „BOLDOG” is ehhez fog kapcsolódni.',

  sections: {
    tags: 'Címkék',
    emotions: 'Érzelmek',
  },

  empty: {
    tags: 'Még nincs címke.',
    emotions: 'Még nincs érzelem.',
  },

  row: {
    colorLabel: 'Szín',
    emojiLabel: 'Emoji',

    displayNameLabel: 'Megjelenített név',
    normalizedNameLabel: 'Normalizált név',

    usageCount: (n) => `${n}×`,

    saveFailed: 'A mentés nem sikerült',
    deleteFailed: 'A törlés nem sikerült',

    delete: {
      // Accusative: "a címkét", "az érzelmet" — and note the article changes
      // with the noun too, which is why these are two whole sentences.
      title: {
        tag: (name) => `Törlöd a(z) „${name}” címkét?`,
        emotion: (name) => `Törlöd a(z) „${name}” érzelmet?`,
      },

      // Nominative here, with the other article again: "A címke", "Az érzelem".
      // Hungarian counts without a plural: "1 bejegyzésről", "12 bejegyzésről".
      inUse: {
        tag: (n) => ({
          before: `A címke ${n} bejegyzésről eltávolításra kerül. A bejegyzések maguk `,
          emphasis: 'nem',
          after: ' törlődnek.',
        }),
        emotion: (n) => ({
          before: `Az érzelem ${n} bejegyzésről eltávolításra kerül. A bejegyzések maguk `,
          emphasis: 'nem',
          after: ' törlődnek.',
        }),
      },

      unused: {
        tag: 'Ez a címke sehol nincs használatban, biztonságosan törölhető.',
        emotion: 'Ez az érzelem sehol nincs használatban, biztonságosan törölhető.',
      },
    },
  },
};
