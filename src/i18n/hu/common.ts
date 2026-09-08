import type { Common } from '../en/common';

export const common: Common = {
  cancel: 'Mégse',
  save: 'Mentés',
  saving: 'Mentés…',
  delete: 'Törlés',
  deleting: 'Törlés…',
  edit: 'Szerkesztés',
  close: 'Bezárás',
  clear: 'Ürítés',
  generate: 'Generálás',
  generating: 'Generálás…',
  loading: 'Betöltés…',
  saved: 'Mentve',
  versionLabel: (n: number) => `v${n}`,
  entryTextPlaceholder: 'Írj szabadon…',

  deleteQuestion: 'Kérdés törlése',
  deleteQuestionTitle: 'Törlöd ezt a kérdést?',
  deleteQuestionDescription: 'A beírt válaszod elvész.',
  previous: '← Előző',
  next: 'Következő →',
  page: (n: number) => `${n}. oldal`,
  noResults: 'Nincs találat.',
  backToSettings: 'Beállítások',
  networkError: 'Hálózati hiba történt',
  unexpectedError: 'Valami hiba történt. Próbáld újra.',
};
