import type { Push } from '../en/push';

export const push: Push = {
  noPrompts: 'Ideje írni a naplódba.',

  // Hungarian counts without a plural: "1 nyitott szándék", "3 nyitott szándék".
  daily: (prompt, openIntentions) =>
    openIntentions > 0 ? `${prompt} (${openIntentions} nyitott szándék mára)` : prompt,

  test: 'Teszt értesítés — minden működik!',
};
