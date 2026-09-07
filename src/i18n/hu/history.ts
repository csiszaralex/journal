import type { History } from '../en/history';

export const history: History = {
  backToEntry: 'Vissza a bejegyzéshez',

  title: 'Verziótörténet',

  // Hungarian counts without a plural: "1 verzió", "12 verzió".
  versionCount: (n) => `${n} verzió`,

  version: {
    currentBadge: 'Jelenlegi',
    restore: 'Visszaállítás',
    scores: (mood, energy) =>
      energy == null ? `Hangulat ${mood}` : `Hangulat ${mood} · Energia ${energy}`,
  },

  detail: {
    editing: 'Szerkesztés alatt',
    historyLink: (versionLabel) => `${versionLabel} · Előzmények`,
  },
};
