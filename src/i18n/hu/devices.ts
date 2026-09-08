import type { Devices } from '../en/devices';

export const devices: Devices = {
  title: 'Eszközök és értesítések',

  enableOnThisDevice: 'Értesítések bekapcsolása ezen az eszközön',
  disableThisDevice: 'Eszköz kikapcsolása',

  empty: 'Még nincs regisztrált eszköz.',

  subscribe: {
    notSupported: 'Ez a böngésző nem támogatja a push értesítéseket.',
    permissionDenied: 'Az értesítési engedélyt elutasítottad.',
    serviceWorkerTimeout: 'A service worker nem áll készen — töltsd újra az oldalt.',
    failed: 'Nem sikerült bekapcsolni az értesítéseket.',
    failedWithStatus: (statusCode) =>
      `Nem sikerült bekapcsolni az értesítéseket (HTTP ${statusCode}).`,
  },

  send: {
    sent: (kind) => (kind === 'test' ? 'Teszt elküldve ✓' : 'Mintaüzenet elküldve ✓'),
    failed: (kind, detail) =>
      kind === 'test'
        ? `A teszt küldése nem sikerült: ${detail}`
        : `A mintaüzenet küldése nem sikerült: ${detail}`,
    failedWithStatus: (kind, statusCode, detail) =>
      kind === 'test'
        ? `A teszt küldése nem sikerült (HTTP ${statusCode}): ${detail}`
        : `A mintaüzenet küldése nem sikerült (HTTP ${statusCode}): ${detail}`,
    failedUnknown: (kind) =>
      kind === 'test'
        ? 'A teszt küldése nem sikerült: ismeretlen hiba'
        : 'A mintaüzenet küldése nem sikerült: ismeretlen hiba',
    failedUnknownWithStatus: (kind, statusCode) =>
      kind === 'test'
        ? `A teszt küldése nem sikerült (HTTP ${statusCode}): ismeretlen hiba`
        : `A mintaüzenet küldése nem sikerült (HTTP ${statusCode}): ismeretlen hiba`,
    noResponse: (kind) =>
      kind === 'test'
        ? 'A teszt küldése nem sikerült: nem jött válasz'
        : 'A mintaüzenet küldése nem sikerült: nem jött válasz',
    expired: 'A feliratkozás lejárt — kapcsold be újra az értesítéseket ezen az eszközön.',
    notFound: 'A feliratkozás nem található.',
  },

  card: {
    sendTest: 'Teszt értesítés küldése',
    sendPreview: 'A mai ütemezett üzenet elküldése most (előnézet)',
    toggle: (enabled) => (enabled ? 'Kikapcsolás' : 'Bekapcsolás'),
    remove: 'Eszköz eltávolítása',

    timezoneLabel: 'Időzóna',
    notifyHourLabel: 'Értesítés órája',
    notifyMinuteLabel: 'Értesítés perce',
  },
};
