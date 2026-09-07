import type { Search } from '../en/search';

export const search: Search = {
  title: 'Keresés',

  placeholder: 'Keress a bejegyzésekben és a címkék között…',

  filters: {
    from: 'Ettől',
    to: 'Eddig',
    moodMin: 'Min. hangulat',
    moodMax: 'Max. hangulat',
    any: 'Bármely',
  },

  heading: {
    results: (query) => `Találatok erre: „${query}”`,
    filtered: 'Szűrt bejegyzések',
    all: 'Összes bejegyzés',
  },

  results: {
    // Hungarian counts without a plural: "1 találat", "12 találat".
    count: (n) => (n === 0 ? 'Nincs találat' : `${n} találat`),
    atLeast: (n) => `${n}+ találat`,
  },

  empty: {
    query: 'Egy bejegyzés sem felel meg a keresésednek.',
    all: 'Nincs bejegyzés.',
  },
};
