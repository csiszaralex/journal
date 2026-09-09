import type { Summary } from '../en/summary';

export const summary: Summary = {
  gapBanner: {
    // Hungarian counts without a plural, and puts the count first: "12 napja".
    silence: (days) => `${days} napja nem írtál`,
    offer: 'Összefoglalod egyben, ami közben történt?',
    action: 'Összefoglaló írása',
  },

  newPage: {
    title: 'Összefoglaló',
    subtitle: 'Egy hosszabb időszak egyben',
  },
};
