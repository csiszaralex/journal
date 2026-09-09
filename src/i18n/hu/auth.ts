import type { Auth } from '../en/auth';

export const auth: Auth = {
  tagline: 'A te privát tered',

  signInWithPasskey: 'Bejelentkezés azonosítókulccsal',

  register: {
    invitation: 'Először jársz itt? Regisztrálj azonosítókulcsot',
    emailLabel: 'E-mail',
    emailPlaceholder: 'te@email.hu',
    submit: 'Azonosítókulcs regisztrálása',
    submitting: 'Regisztráció…',
  },

  signedOutForInactivity: (minutes) => `${minutes} perc tétlenség után kiléptettünk.`,

  errors: {
    // The keys are the codes NextAuth sends — they stay as they are.
    byCode: {
      AccessDenied: 'Hozzáférés megtagadva. Ez a fiók nem engedélyezett.',
      Configuration: 'Szerverkonfigurációs hiba. Próbáld újra később.',
      Verification: 'A bejelentkezési link lejárt.',
    },

    signInFailed:
      'A bejelentkezés nem sikerült. Lehet, hogy az azonosítókulcsod nincs bejegyezve ezen az eszközön.',

    emailRequired: 'Add meg az e-mail-címed az azonosítókulcs regisztrálásához.',
    registrationFailed: 'A regisztráció nem sikerült. Próbáld újra.',
  },
};
