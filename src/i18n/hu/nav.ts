import type { Nav } from '../en/nav';

export const nav: Nav = {
  today: 'Ma',
  calendar: 'Naptár',
  intentions: 'Szándékok',
  search: 'Keresés',
  stats: 'Statisztika',
  settings: 'Beállítások',
  more: 'Továbbiak',
  signOut: 'Kijelentkezés',

  shortcuts: {
    title: 'Billentyűparancsok',
    goToToday: 'Ugrás a mai napra',
    goToCalendar: 'Ugrás a naptárra',
    goToSearch: 'Ugrás a keresésre',
    goToStats: 'Ugrás a statisztikára',
    goToDevices: 'Ugrás az eszközökre',
    goToSettings: 'Ugrás a beállításokra',
    showHelp: 'A súgó megjelenítése',
  },

  inactivity: {
    title: 'Ott vagy még?',
    body: (seconds: number) => ({
      before: 'Inaktivitás miatt ',
      emphasis: `${seconds} mp`,
      after: ' múlva kiléptetünk.',
    }),
    stayLoggedIn: 'Bejelentkezve maradok',
  },

  offlineBanner:
    'Nincs internetkapcsolat — a bejegyzések a kapcsolat helyreállásakor szinkronizálódnak',
};
