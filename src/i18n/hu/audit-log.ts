import type { AuditLog } from '../en/audit-log';

export const auditLog: AuditLog = {
  title: 'Eseménynapló',

  searchPlaceholder: 'Keresés…',
  filterButton: 'Szűrés',
  allCategories: 'Minden kategória',

  // The keys are the stored slugs and never change; only the labels do.
  categories: {
    auth: 'Bejelentkezés',
    entry: 'Bejegyzések',
    tag: 'Címkék',
    emotion: 'Érzelmek',
    profile: 'Profil',
    intention: 'Szándékok',
    template: 'Sablonok',
    export: 'Exportálás',
    push: 'Push értesítések',
    settings: 'Beállítások',
    ai: 'AI',
  },

  // Hungarian counts without a plural: "1 bejegyzés", "12 bejegyzés".
  resultCount: (n) => `${n} bejegyzés`,

  metadata: 'metaadatok',

  pageIndicator: (page, totalPages) => `${page}. oldal / ${totalPages}`,
};
