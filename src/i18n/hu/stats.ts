import type { Stats } from '../en/stats';

export const stats: Stats = {
  title: 'Statisztika',

  cards: {
    totalEntries: 'Összes bejegyzés',
    currentStreak: 'Jelenlegi sorozat',
    bestStreak: 'Leghosszabb sorozat',
    avgMood30d: 'Átlagos hangulat (30 nap)',
    avgEnergy30d: 'Átlagos energia (30 nap)',

    // Hungarian counts without a plural: "1 nap", "12 nap".
    streakDays: (n) => ({
      before: '',
      emphasis: `${n}`,
      after: ' nap',
    }),
  },

  consistency: {
    heading: 'Rendszeresség',
    // Hungarian names the whole first and the part second: "312 napból 208".
    summary: (daysWithEntries, totalDays, pct) =>
      `${totalDays} napból ${daysWithEntries} · ${pct}% az első bejegyzésed óta`,
    none: 'Még nincs bejegyzés',
    firstEntry: (date) => `Első bejegyzés: ${date}`,
  },

  charts: {
    heading: (days) => ({
      before: 'Hangulat és energia ',
      emphasis: `(utolsó ${days} nap)`,
      after: '',
    }),
    empty: 'Még nincs adat — rögzíts hangulat- és energiaértéket a bejegyzéseidnél.',
  },

  series: {
    mood: 'Hangulat',
    energy: 'Energia',
  },
};
