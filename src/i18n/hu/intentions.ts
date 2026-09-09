import type { Intentions } from '../en/intentions';

export const intentions: Intentions = {
  title: 'Szándékok',

  tabs: {
    open: (n) => `Nyitott (${n})`,
    done: 'Kész',
  },

  groups: {
    overdue: 'Lejárt',
    today: 'Ma',
    soon: 'Hamarosan',
    undated: 'Dátum nélkül',
  },

  empty: {
    open: 'Nincs nyitott szándék.',
    list: 'Nincs megjelenítendő szándék.',
    recentlyClosed: (days) => `Az elmúlt ${days} napban nem zártál le szándékot.`,
  },

  filter: {
    all: 'Mind',
  },

  today: {
    heading: (n) => (n > 0 ? `Nyitott szándékok mára (${n})` : 'Nyitott szándékok mára'),
    seeAll: 'összes →',
  },

  form: {
    placeholder: 'Új szándék…',
    placeholderToday: 'Új szándék mára…',
    textPlaceholder: 'szöveg…',
    editCategory: 'Kategória szerkesztése',
    datePlaceholder: 'Dátum',
    clearDate: 'Dátum törlése',
    submit: 'Hozzáad',
  },

  row: {
    complete: 'Kész',
    actions: 'Műveletek',
    drop: 'Elejtés',
    reopen: 'Visszanyit',

    // Hungarian counts without a plural: "1 napja lejárt", "12 napja lejárt".
    dueLabel: (date, overdueDays) =>
      overdueDays > 0 ? `${date} · ${overdueDays} napja lejárt` : date,

    delete: {
      title: 'Törlöd ezt a szándékot?',
      description: (text) =>
        `A(z) „${text}” szándék eltűnik a listákból. Az alkalmazásból nem hozható vissza.`,
    },
  },

  categories: {
    title: 'Kategóriák',
    intro:
      'Minden szándék-kategória automatikusan kap egy stabil színt a nevéből. Itt felülírhatod bármelyiket, vagy visszaállíthatod az automatikus színre.',

    // A kettőspont a szintaxis, az szó szerint marad; a körülötte lévő két
    // példaszó viszont magyarul van. A hangsúlyos rész a mondat végén áll
    // angolul, itt viszont még egy szó követi.
    empty: {
      before: 'Még nincs egyetlen kategória sem. Hozz létre szándékot ',
      emphasis: '„Kategória: szöveg”',
      after: ' formában.',
    },

    colorLabel: (name) => `${name} színe`,
    reset: 'Alaphelyzet',
    resetTitle: 'Vissza az automatikus színre',
  },
};
