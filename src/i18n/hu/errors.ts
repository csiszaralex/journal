import type { Errors } from '../en/errors';

export const errors: Errors = {
  validation: {
    dateFormat: 'A formátum ÉÉÉÉ-HH-NN legyen',

    summaryNeedsStart: 'Az összefoglalóhoz kezdő dátum kell',
    startAfterEnd: 'A kezdő dátum nem lehet későbbi a záró dátumnál',
    dailyHasNoPeriod: 'Napi bejegyzésnek nincs időszaka',

    scoreRange: 'Válassz 1 és 5 közötti értéket',

    templateNameRequired: 'A sablonnak adj nevet',
    templateNameTooLong: 'A sablon neve legfeljebb 60 karakter lehet',
    missingTemplateId: 'Hiányzik a sablon azonosítója',

    invalidInput: 'Érvénytelen adat',
  },

  api: {
    unauthorized: 'Nem vagy bejelentkezve',
    tooManyRequests: 'Túl sok kérés',
    tooFast: 'Túl gyors, várj egy kicsit',

    invalidRequestBody: 'Érvénytelen kérés',
    invalidJson: 'Hibás JSON',
    internalError: 'Belső hiba történt',

    aiBadResponse: 'AI hibás választ adott',

    invalidSubscription: 'Érvénytelen feliratkozás',
    missingEndpoint: 'Hiányzik a végpont',
    invalidDate: 'Érvénytelen dátum',

    entryNotFound: 'A bejegyzés nem található',
    duplicateEntryDate: 'Erre a napra már van aktív bejegyzés',
    unknownAction: 'Ismeretlen művelet',
  },

  action: {
    failed: 'Hiba történt a művelet közben',

    // The noun stays out of both sentences here, the same way English leaves it
    // out — but they are still two keys, so that either one may name what it
    // collided with later ("Ilyen nevű címke…", "Ilyen nevű érzelem…") without
    // dragging the other along.
    nameConflict: {
      tag: (existing) => `Ez a név már létezik mint „${existing}”`,
      emotion: (existing) => `Ez a név már létezik mint „${existing}”`,
    },
  },
};
