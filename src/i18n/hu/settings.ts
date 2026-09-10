import type { Settings } from '../en/settings';

export const settings: Settings = {
  title: 'Beállítások',

  language: 'Nyelv',

  theme: {
    light: 'Világos mód',
    dark: 'Sötét mód',
  },

  cards: {
    sessions: 'Munkamenetek és azonosítókulcsok',
    devices: 'Eszközök és értesítések',
    profile: 'Profil',
    tags: 'Címkék és érzelmek',
    categories: 'Kategóriák',
    auditLog: 'Eseménynapló',
  },

  sections: {
    templates: 'Bejegyzéssablonok',
    ai: 'AI',
    registration: 'Regisztráció',
    export: 'Adatok exportálása',
  },

  templates: {
    empty: 'Még nincs sablon.',
    add: 'Új sablon',
    nameLabel: 'Név',
    namePlaceholder: 'Reggeli reflexió…',
    textLabel: 'Alapértelmezett szöveg (opcionális)',
    moodLabel: 'Hangulat',
    energyLabel: 'Energia',
    create: 'Sablon mentése',
    update: 'Sablon frissítése',
    defaults: (mood, energy) =>
      mood != null && energy != null
        ? `Hangulat: ${mood} · Energia: ${energy}`
        : mood != null
          ? `Hangulat: ${mood}`
          : energy != null
            ? `Energia: ${energy}`
            : '',
  },

  ai: {
    historyEntries: {
      label: 'Napló-előzmény az AI kérdésekhez',
      description: 'Hány korábbi naplóbejegyzést kapjon az AI, amikor új kérdéseket javasol.',
      selectLabel: 'Előzmény bejegyzések száma',
      // Hungarian counts without a plural: "1 bejegyzés", "12 bejegyzés".
      value: (n) => `${n} bejegyzés`,
    },
    summaryGap: {
      label: 'Összefoglaló felajánlása',
      description: 'Hány kihagyott nap után ajánlja fel az app, hogy összefoglalót írj az időszakról.',
      selectLabel: 'Kihagyott napok száma',
      // Hungarian counts without a plural: "1 nap", "12 nap".
      value: (n) => `${n} nap`,
    },
  },

  registration: {
    label: 'Új regisztrációk engedélyezése',
    enabled:
      'A bejelentkezési oldalon új azonosítókulcs regisztrálható. Kapcsold ki, amint az eszközöd be van jegyezve — a bejelentkezési oldal nyilvános.',
    disabled:
      'A regisztráció ki van kapcsolva. Csak a már meglévő azonosítókulcsokkal lehet belépni — kivéve, ha egy sincs bejegyezve, mert az elsőt mindig fel lehet venni.',
    toggleLabel: 'Regisztráció be- és kikapcsolása',
  },

  shortcuts: {
    intro: (key) => ({
      before: 'Nyomd meg bárhol a ',
      emphasis: key,
      after: ' billentyűt a billentyűparancsok listájának megnyitásához.',
    }),
    saveEntry: 'Bejegyzés mentése az űrlapon',
    disabledWhileTyping: 'A billentyűparancsok nem működnek, amíg egy mezőbe gépelsz.',
  },

  install: {
    title: 'Alkalmazás telepítése',
    iosHeading: 'iOS (Safari)',
    // The path as the Hungarian iOS spells it.
    iosStep: () => ({
      before: 'Koppints ide: ',
      emphasis: 'Megosztás → Főképernyőhöz adás',
      after: '.',
    }),
    iosPush:
      'A push értesítésekhez iOS 16.4 vagy újabb szükséges, és előbb fel kell venned az alkalmazást a főképernyőre.',
    androidHeading: 'Android / asztali gép (Chrome)',
    // The menu item as the Hungarian Chrome names it.
    androidStep: () => ({
      before:
        'Koppints a címsorban lévő telepítés ikonra, vagy nyisd meg a böngésző menüjét, és válaszd az ',
      emphasis: 'Alkalmazás telepítése',
      after: ' lehetőséget.',
    }),
  },

  export: {
    json: 'Exportálás JSON-ba',
    markdown: 'Exportálás Markdownba',
    reflectionsHeading: 'Reflexiók',
  },
};
