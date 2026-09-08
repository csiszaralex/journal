import type { Sessions } from '../en/sessions';

export const sessions: Sessions = {
  title: 'Munkamenetek és azonosítókulcsok',

  passkeys: {
    heading: 'Azonosítókulcsok',
    description:
      'Regisztrált kulcsok, amelyekkel bejelentkezhetsz. Az utolsó megmaradt azonosítókulcsot nem lehet törölni.',
    add: 'Azonosítókulcs hozzáadása ezen az eszközön',
    empty: 'Nincs regisztrált azonosítókulcs.',
    namePlaceholder: 'Névtelen azonosítókulcs',

    deviceType: (type) =>
      type === 'singleDevice' ? 'Egy eszközhöz kötött kulcs' : 'Szinkronizált kulcs',

    added: (date) => `Hozzáadva: ${date}`,

    deleteTitle: 'Azonosítókulcs törlése',
    deleteDisabledTitle: 'Az utolsó azonosítókulcsodat nem törölheted',

    confirmTitle: 'Törlöd ezt az azonosítókulcsot?',
    confirmDescription:
      'Ezzel a kulccsal többé nem tudsz bejelentkezni. A művelet nem vonható vissza.',

    optionsFailed: 'Nem sikerült lekérni a regisztrációs beállításokat',
  },

  active: {
    heading: 'Aktív munkamenetek',
    description:
      'A fiókodba jelenleg bejelentkezett eszközök. A most használt munkamenetedet nem tudod visszavonni.',
    empty: 'Nincs aktív munkamenet.',
    namePlaceholder: 'Névtelen munkamenet',
    currentBadge: 'Jelenlegi',

    signedIn: (date) => `Bejelentkezés: ${date}`,
    expires: (date) => `Lejár: ${date}`,

    revoke: 'Visszavonás',
    revokeTitle: 'Munkamenet visszavonása',
    revokeDisabledTitle: 'A jelenlegi munkamenetedet nem tudod visszavonni',

    confirmTitle: 'Visszavonod ezt a munkamenetet?',
    confirmDescription: 'Az adott eszköz a következő kérésnél kijelentkezik.',
  },
};
